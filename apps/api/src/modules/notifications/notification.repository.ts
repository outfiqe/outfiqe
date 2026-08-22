import { prisma } from "#db/prisma.js";
import { Prisma } from "#generated/prisma/client.js";
import type { NotificationEntityType, NotificationType } from "#generated/prisma/enums.js";
import { decodeCursor } from "#lib/pagination.utils.js";
import { isForeignKeyConstraintError } from "#lib/prisma.utils.js";
import logger from "#lib/winston.utils.js";
import { describeError } from "#redis/redis.utils.js";

import type {
  CreateIndividualNotificationInput,
  NotificationActorSnapshot,
  NotificationFeedCursor,
  NotificationMetadata,
  NotificationRecord,
  RetractGroupActorInput,
  UpsertGroupInput,
} from "./notification.types.js";
import { removeRecentActor, toNotificationRecord } from "./notification.utils.js";

type RawGroupRow = {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  type: NotificationType;
  entity_type: NotificationEntityType | null;
  entity_id: string | null;
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
  metadata: (row.metadata ?? {}) as NotificationMetadata,
  groupKey: row.group_key,
  actorCount: row.actor_count,
  isRead: row.is_read,
  readAt: row.read_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const notificationRepository = {
  async createIndividual(
    input: CreateIndividualNotificationInput,
  ): Promise<NotificationRecord | null> {
    try {
      const created = await prisma.notification.create({
        data: {
          recipientId: input.recipientId,
          actorId: input.actorId ?? undefined,
          type: input.type,
          entityType: input.entityType ?? undefined,
          entityId: input.entityId ?? undefined,
          metadata: input.metadata as Prisma.InputJsonValue,
        },
      });
      return toNotificationRecord(created);
    } catch (error) {
      if (!isForeignKeyConstraintError(error)) throw error;
      logger.warn(
        `Skipped notification for a since-deleted recipient or actor: type=${input.type} recipient=${input.recipientId}`,
      );
      return null;
    }
  },

  async upsertGroup(
    input: UpsertGroupInput,
  ): Promise<{ record: NotificationRecord; wasCreated: boolean } | null> {
    try {
      return await prisma.$transaction(async (tx) => {
        const metadata: NotificationMetadata = { ...input.metadata, recentActors: [input.actor] };

        const inserted = await tx.$queryRaw<RawGroupRow[]>(Prisma.sql`
          INSERT INTO "notifications"
            ("id", "recipient_id", "actor_id", "type", "entity_type", "entity_id", "metadata", "group_key", "actor_count", "updated_at")
          VALUES
            (gen_random_uuid(), ${input.recipientId}::uuid, ${input.actorId}::uuid, ${input.type}::"NotificationType",
             ${input.entityType ?? null}::"NotificationEntityType", ${input.entityId ?? null},
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

        const updatedRows = await tx.$queryRaw<RawGroupRow[]>(Prisma.sql`
          UPDATE "notifications"
          SET "metadata" = ${JSON.stringify(nextMetadata)}::jsonb,
              "actor_count" = ${nextActorCount},
              "actor_id" = ${input.actorId}::uuid,
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

  async findMutedRecipientIds(
    recipientIds: string[],
    type: NotificationType,
  ): Promise<Set<string>> {
    if (recipientIds.length === 0) return new Set();
    const rows = await prisma.notificationPreference.findMany({
      where: { userId: { in: recipientIds }, type, enabled: false },
      select: { userId: true },
    });
    return new Set(rows.map((row) => row.userId));
  },

  async findActorSnapshot(userId: string): Promise<NotificationActorSnapshot | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, handle: true, avatarUrl: true },
    });
    return user;
  },

  async findLookSnapshot(
    lookId: string,
  ): Promise<{ imageUrl: string; caption: string | null } | null> {
    return prisma.creatorLook.findUnique({
      where: { id: lookId },
      select: { imageUrl: true, caption: true },
    });
  },

  async findBrandMemberIds(brandId: string): Promise<string[]> {
    const rows = await prisma.brandMembership.findMany({
      where: { brandId },
      select: { userId: true },
    });
    return rows.map((row) => row.userId);
  },

  async findOrderNotificationContext(
    orderId: string,
  ): Promise<{ total: number; brandIds: string[] } | null> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        total: true,
        items: { select: { product: { select: { brandId: true } } } },
      },
    });
    if (!order) return null;

    const brandIds = [...new Set(order.items.map((item) => item.product.brandId))];
    return { total: order.total, brandIds };
  },

  async listForRecipient(
    recipientId: string,
    params: { cursor?: string; limit: number },
  ): Promise<NotificationRecord[]> {
    const decoded = decodeCursor<NotificationFeedCursor>(params.cursor);

    const rows = await prisma.notification.findMany({
      where: {
        recipientId,
        ...(decoded
          ? {
              OR: [
                { updatedAt: { lt: new Date(decoded.updatedAt) } },
                { updatedAt: new Date(decoded.updatedAt), id: { lt: decoded.id } },
              ],
            }
          : {}),
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: params.limit + 1,
    });
    return rows.map(toNotificationRecord);
  },

  async countUnread(recipientId: string): Promise<number> {
    return prisma.notification.count({ where: { recipientId, isRead: false } });
  },

  async markRead(recipientId: string, notificationId: string): Promise<NotificationRecord | null> {
    const existing = await prisma.notification.findFirst({
      where: { id: notificationId, recipientId },
    });
    if (!existing) return null;
    if (existing.isRead) return toNotificationRecord(existing);

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });
    return toNotificationRecord(updated);
  },

  async markAllRead(recipientId: string): Promise<Date> {
    const readAt = new Date();
    await prisma.notification.updateMany({
      where: { recipientId, isRead: false },
      data: { isRead: true, readAt },
    });
    return readAt;
  },

  async listPreferenceOverrides(userId: string): Promise<Map<NotificationType, boolean>> {
    const rows = await prisma.notificationPreference.findMany({
      where: { userId },
      select: { type: true, enabled: true },
    });
    return new Map(rows.map((row) => [row.type, row.enabled]));
  },

  async setPreference(userId: string, type: NotificationType, enabled: boolean): Promise<void> {
    await prisma.notificationPreference.upsert({
      where: { userId_type: { userId, type } },
      create: { userId, type, enabled },
      update: { enabled },
    });
  },

  async deleteReadBefore(readBefore: Date, types: NotificationType[]): Promise<number> {
    if (types.length === 0) return 0;
    const { count } = await prisma.notification.deleteMany({
      where: { isRead: true, readAt: { lt: readBefore }, type: { in: types } },
    });
    return count;
  },
};
