import { prisma } from "#db/prisma.js";
import { Prisma } from "#generated/prisma/client.js";
import type {
  NotificationEntityType,
  NotificationSurface,
  NotificationType,
} from "#generated/prisma/enums.js";
import { isForeignKeyConstraintError, isUniqueConstraintError } from "#lib/prisma.utils.js";
import logger from "#lib/winston.utils.js";
import { describeError } from "#redis/redis.utils.js";

import { resolveNotificationTarget } from "../notification.targets.js";
import type {
  CreateIndividualNotificationInput,
  CreateManyForBroadcastRow,
  NotificationMetadata,
  NotificationRecord,
  RetractGroupActorInput,
  UpsertGroupInput,
} from "../notification.types.js";
import {
  buildNotificationDedupeKey,
  removeRecentActor,
  toNotificationRecord,
} from "../notification.utils.js";

type RawGroupRow = {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  type: NotificationType;
  entity_type: NotificationEntityType | null;
  entity_id: string | null;
  target_surface: NotificationSurface | null;
  target_path: string | null;
  organization_id: string | null;
  metadata: unknown;
  group_key: string | null;
  actor_count: number;
  is_read: boolean;
  read_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

const isRawForeignKeyViolation = (error: unknown): boolean =>
  describeError(error).toLowerCase().includes("foreign key constraint");

const toRecordFromRaw = (row: RawGroupRow): NotificationRecord => ({
  id: row.id,
  recipientId: row.recipient_id,
  actorId: row.actor_id,
  type: row.type,
  entityType: row.entity_type,
  entityId: row.entity_id,
  targetSurface: row.target_surface,
  targetPath: row.target_path,
  organizationId: row.organization_id,
  metadata: (row.metadata ?? {}) as NotificationMetadata,
  groupKey: row.group_key,
  actorCount: row.actor_count,
  isRead: row.is_read,
  readAt: row.read_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const notificationDeliveryRepository = {
  async createIndividual(
    input: CreateIndividualNotificationInput,
  ): Promise<NotificationRecord | null> {
    try {
      const target = resolveNotificationTarget({
        type: input.type,
        entityId: input.entityId ?? null,
        metadata: input.metadata,
        recipientIsStaff: input.recipientIsStaff,
      });
      const created = await prisma.notification.create({
        data: {
          recipientId: input.recipientId,
          actorId: input.actorId ?? undefined,
          type: input.type,
          entityType: input.entityType ?? undefined,
          entityId: input.entityId ?? undefined,
          targetSurface: target?.surface ?? undefined,
          targetPath: target?.path ?? undefined,
          organizationId: input.organizationId ?? undefined,
          dedupeKey: input.sourceEventId
            ? buildNotificationDedupeKey(input.sourceEventId, input.type, input.entityId)
            : undefined,
          metadata: input.metadata as Prisma.InputJsonValue,
        },
      });
      return toNotificationRecord(created);
    } catch (error) {
      if (input.sourceEventId && isUniqueConstraintError(error)) {
        logger.info(
          `Skipped a repeat notification for an already-handled event: type=${input.type} recipient=${input.recipientId}`,
        );
        return null;
      }
      if (!isForeignKeyConstraintError(error)) throw error;
      logger.warn(
        `Skipped notification for a since-deleted recipient or actor: type=${input.type} recipient=${input.recipientId}`,
      );
      return null;
    }
  },

  async createManyForBroadcast(rows: CreateManyForBroadcastRow[]): Promise<NotificationRecord[]> {
    if (rows.length === 0) return [];

    const data = rows.map((row) => ({
      recipientId: row.recipientId,
      type: row.type,
      entityType: row.entityType ?? undefined,
      entityId: row.entityId ?? undefined,
      targetSurface: row.targetSurface ?? undefined,
      targetPath: row.targetPath ?? undefined,
      metadata: row.metadata as Prisma.InputJsonValue,
    }));

    try {
      const created = await prisma.notification.createManyAndReturn({ data });
      return created.map(toNotificationRecord);
    } catch (error) {
      if (!isForeignKeyConstraintError(error)) throw error;

      const candidateIds = [...new Set(rows.map((row) => row.recipientId))];
      const stillExistingUsers = await prisma.user.findMany({
        where: { id: { in: candidateIds } },
        select: { id: true },
      });
      const stillExistingIds = new Set(stillExistingUsers.map((user) => user.id));
      const survivingData = data.filter((row) => stillExistingIds.has(row.recipientId));

      logger.warn(
        `Skipped ${rows.length - survivingData.length} broadcast notification(s) for since-deleted recipients`,
      );
      if (survivingData.length === 0) return [];

      const created = await prisma.notification.createManyAndReturn({ data: survivingData });
      return created.map(toNotificationRecord);
    }
  },

  async upsertGroup(
    input: UpsertGroupInput,
  ): Promise<{ record: NotificationRecord; wasCreated: boolean } | null> {
    try {
      return await prisma.$transaction(async (tx) => {
        const metadata: NotificationMetadata = { ...input.metadata, recentActors: [input.actor] };
        const insertTarget = resolveNotificationTarget({
          type: input.type,
          entityId: input.entityId ?? null,
          metadata,
        });

        const inserted = await tx.$queryRaw<RawGroupRow[]>(Prisma.sql`
          INSERT INTO "notifications"
            ("id", "recipient_id", "actor_id", "type", "entity_type", "entity_id", "target_surface", "target_path", "metadata", "group_key", "actor_count", "updated_at")
          VALUES
            (gen_random_uuid(), ${input.recipientId}::uuid, ${input.actorId}::uuid, ${input.type}::"NotificationType",
             ${input.entityType ?? null}::"NotificationEntityType", ${input.entityId ?? null},
             ${insertTarget?.surface ?? null}::"NotificationSurface", ${insertTarget?.path ?? null},
             ${JSON.stringify(metadata)}::jsonb, ${input.groupKey}, 1, now())
          ON CONFLICT ("recipient_id", "group_key") WHERE "is_read" = false AND "group_key" IS NOT NULL
          DO NOTHING
          RETURNING *
        `);

        const insertedRow = inserted[0];
        if (insertedRow) return { record: toRecordFromRaw(insertedRow), wasCreated: true };

        const existingRows = await tx.$queryRaw<RawGroupRow[]>(Prisma.sql`
          SELECT * FROM "notifications"
          WHERE "recipient_id" = ${input.recipientId}::uuid
            AND "group_key" = ${input.groupKey}
            AND "is_read" = false
          FOR UPDATE
        `);
        const existing = existingRows[0];
        if (!existing) {
          throw new Error(
            `Notification group conflicted but no open row was found: recipient=${input.recipientId} groupKey=${input.groupKey}`,
          );
        }

        const existingMetadata = (existing.metadata ?? {}) as NotificationMetadata;
        const dedupedActors = (existingMetadata.recentActors ?? []).filter(
          (actor) => actor.id !== input.actor.id,
        );
        const nextRecentActors = [input.actor, ...dedupedActors].slice(0, 3);
        const nextMetadata: NotificationMetadata = {
          ...existingMetadata,
          ...input.metadata,
          recentActors: nextRecentActors,
        };
        const nextActorCount = existing.actor_count + 1;
        const nextTarget = resolveNotificationTarget({
          type: input.type,
          entityId: input.entityId ?? null,
          metadata: nextMetadata,
        });

        const updatedRows = await tx.$queryRaw<RawGroupRow[]>(Prisma.sql`
          UPDATE "notifications"
          SET "metadata" = ${JSON.stringify(nextMetadata)}::jsonb,
              "actor_count" = ${nextActorCount},
              "actor_id" = ${input.actorId}::uuid,
              "target_surface" = ${nextTarget?.surface ?? null}::"NotificationSurface",
              "target_path" = ${nextTarget?.path ?? null},
              "updated_at" = now()
          WHERE "id" = ${existing.id}::uuid
          RETURNING *
        `);
        const updated = updatedRows[0];
        if (!updated) throw new Error(`Failed to update notification group: ${existing.id}`);

        return { record: toRecordFromRaw(updated), wasCreated: false };
      });
    } catch (error) {
      if (!isRawForeignKeyViolation(error)) throw error;
      logger.warn(
        `Skipped notification group for a since-deleted recipient or actor: type=${input.type} recipient=${input.recipientId}`,
      );
      return null;
    }
  },

  async retractGroupActor(input: RetractGroupActorInput): Promise<NotificationRecord | null> {
    return prisma.$transaction(async (tx) => {
      const existingRows = await tx.$queryRaw<RawGroupRow[]>(Prisma.sql`
        SELECT * FROM "notifications"
        WHERE "recipient_id" = ${input.recipientId}::uuid
          AND "group_key" = ${input.groupKey}
          AND "is_read" = false
        FOR UPDATE
      `);
      const existing = existingRows[0];
      if (!existing) return null;

      const nextActorCount = existing.actor_count - 1;
      if (nextActorCount <= 0) {
        await tx.notification.delete({ where: { id: existing.id } });
        return null;
      }

      const existingMetadata = (existing.metadata ?? {}) as NotificationMetadata;
      const nextRecentActors = removeRecentActor(
        existingMetadata.recentActors ?? [],
        input.actorId,
      );
      const nextMetadata: NotificationMetadata = {
        ...existingMetadata,
        recentActors: nextRecentActors,
      };
      const nextActorId = nextRecentActors[0]?.id ?? existing.actor_id;

      const updatedRows = await tx.$queryRaw<RawGroupRow[]>(Prisma.sql`
        UPDATE "notifications"
        SET "metadata" = ${JSON.stringify(nextMetadata)}::jsonb,
            "actor_count" = ${nextActorCount},
            "actor_id" = ${nextActorId}::uuid,
            "updated_at" = now()
        WHERE "id" = ${existing.id}::uuid
        RETURNING *
      `);
      const updated = updatedRows[0];
      return updated ? toRecordFromRaw(updated) : null;
    });
  },

  async upsertSystemReminder(input: {
    recipientId: string;
    type: NotificationType;
    entityType?: NotificationEntityType | null;
    entityId?: string | null;
    groupKey: string;
    metadata: NotificationMetadata;
  }): Promise<{ record: NotificationRecord; wasCreated: boolean } | null> {
    try {
      return await prisma.$transaction(async (tx) => {
        const existing = await tx.notification.findFirst({
          where: {
            recipientId: input.recipientId,
            groupKey: input.groupKey,
            isRead: false,
          },
        });

        if (existing) {
          const merged = {
            ...(existing.metadata as NotificationMetadata),
            ...input.metadata,
          };
          const updated = await tx.notification.update({
            where: { id: existing.id },
            data: { metadata: merged as Prisma.InputJsonValue, updatedAt: new Date() },
          });
          return { record: toNotificationRecord(updated), wasCreated: false };
        }

        const created = await tx.notification.create({
          data: {
            recipientId: input.recipientId,
            type: input.type,
            entityType: input.entityType ?? undefined,
            entityId: input.entityId ?? undefined,
            groupKey: input.groupKey,
            metadata: input.metadata as Prisma.InputJsonValue,
          },
        });
        return { record: toNotificationRecord(created), wasCreated: true };
      });
    } catch (error) {
      if (!isForeignKeyConstraintError(error)) throw error;
      logger.warn(`Skipped system reminder for a since-deleted recipient: ${input.recipientId}`);
      return null;
    }
  },
};
