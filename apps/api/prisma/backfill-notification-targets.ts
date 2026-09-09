import "../src/config/load-env.js";

import type { Prisma } from "../src/generated/prisma/client.js";
import { CreatorStatus, NotificationType } from "../src/generated/prisma/enums.js";
import { resolveNotificationTarget } from "../src/modules/notifications/notification.targets.js";
import type {
  NotificationActorSnapshot,
  NotificationMetadata,
} from "../src/modules/notifications/notification.types.js";
import { prisma } from "../src/shared/db/prisma.js";

const BATCH_SIZE = 500;
const STAFF_REPLY_METADATA_MARKER = "recipientIsStaff";

const isDryRun = process.argv.includes("--dry-run");

const FOLLOWER_NOTIFICATION_TYPES = new Set<NotificationType>([
  NotificationType.NEW_FOLLOWER,
  NotificationType.NEW_BRAND_FOLLOWER,
]);

const LOOK_NOTIFICATION_TYPES = new Set<NotificationType>([
  NotificationType.LOOK_LIKED,
  NotificationType.LOOK_COMMENTED,
  NotificationType.COMMENT_REPLIED,
]);

const hydrateFollowerActorContext = async (
  metadata: NotificationMetadata,
): Promise<NotificationMetadata> => {
  const actors = [...(metadata.recentActors ?? []), ...(metadata.actor ? [metadata.actor] : [])];
  const actorIds = [...new Set(actors.map((actor) => actor.id))];
  if (actorIds.length === 0) return metadata;

  const users = await prisma.user.findMany({
    where: { id: { in: actorIds } },
    select: {
      id: true,
      isCreator: true,
      creatorStatus: true,
      memberships: { select: { brandId: true }, take: 1 },
    },
  });
  const contextByUserId = new Map(
    users.map((user) => [
      user.id,
      {
        isCreator: user.isCreator && user.creatorStatus === CreatorStatus.APPROVED,
        brandId: user.memberships[0]?.brandId ?? null,
      },
    ]),
  );

  const withContext = (actor: NotificationActorSnapshot): NotificationActorSnapshot => ({
    ...actor,
    isCreator: contextByUserId.get(actor.id)?.isCreator ?? false,
    brandId: contextByUserId.get(actor.id)?.brandId ?? null,
  });

  return {
    ...metadata,
    ...(metadata.recentActors ? { recentActors: metadata.recentActors.map(withContext) } : {}),
    ...(metadata.actor ? { actor: withContext(metadata.actor) } : {}),
  };
};

const hydrateLookOwnerHandle = async (
  metadata: NotificationMetadata,
  entityId: string | null,
): Promise<NotificationMetadata> => {
  if (metadata.lookOwnerHandle || !entityId) return metadata;

  const look = await prisma.creatorLook.findUnique({
    where: { id: entityId },
    select: { creator: { select: { handle: true } } },
  });
  return look ? { ...metadata, lookOwnerHandle: look.creator.handle } : metadata;
};

const rehydrateMetadata = async (
  type: NotificationType,
  entityId: string | null,
  metadata: NotificationMetadata,
): Promise<NotificationMetadata> => {
  if (FOLLOWER_NOTIFICATION_TYPES.has(type)) return hydrateFollowerActorContext(metadata);
  if (LOOK_NOTIFICATION_TYPES.has(type)) return hydrateLookOwnerHandle(metadata, entityId);
  return metadata;
};

const backfill = async (): Promise<void> => {
  let cursor: string | undefined;
  let processed = 0;
  let rewritten = 0;

  for (;;) {
    const rows = await prisma.notification.findMany({
      select: {
        id: true,
        type: true,
        entityId: true,
        targetSurface: true,
        targetPath: true,
        metadata: true,
      },
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    if (rows.length === 0) break;
    cursor = rows[rows.length - 1]?.id;

    for (const row of rows) {
      processed += 1;

      const originalMetadata = (row.metadata ?? {}) as NotificationMetadata &
        Record<string, unknown>;
      const metadata = await rehydrateMetadata(row.type, row.entityId, originalMetadata);

      const target = resolveNotificationTarget({
        type: row.type,
        entityId: row.entityId,
        metadata,
        recipientIsStaff: originalMetadata[STAFF_REPLY_METADATA_MARKER] === true,
      });

      const metadataChanged = JSON.stringify(metadata) !== JSON.stringify(originalMetadata);
      const targetChanged =
        (target?.surface ?? null) !== row.targetSurface ||
        (target?.path ?? null) !== row.targetPath;
      if (!metadataChanged && !targetChanged) continue;

      if (!isDryRun) {
        await prisma.notification.update({
          where: { id: row.id },
          data: {
            ...(metadataChanged ? { metadata: metadata as Prisma.InputJsonValue } : {}),
            ...(targetChanged
              ? { targetSurface: target?.surface ?? null, targetPath: target?.path ?? null }
              : {}),
          },
        });
      }
      rewritten += 1;
    }

    process.stdout.write(`processed ${processed}, rewritten ${rewritten}\n`);
  }

  process.stdout.write(
    `${isDryRun ? "[dry-run] " : ""}done: ${rewritten} of ${processed} notifications updated\n`,
  );
};

backfill()
  .catch((error) => {
    process.stderr.write(`${String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
