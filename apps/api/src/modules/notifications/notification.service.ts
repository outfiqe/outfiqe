import { DomainEvents, eventBus } from "#events/event-bus.js";
import type { NotificationEntityType } from "#generated/prisma/enums.js";
import { NotificationType } from "#generated/prisma/enums.js";
import { buildCursorPage, encodeCursor } from "#lib/pagination.utils.js";
import logger from "#lib/winston.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { describeError } from "#redis/redis.utils.js";
import { SOCKET_EVENTS, userRoom } from "#socket/socket.keys.js";
import { getIO } from "#socket/socket.server.js";

import { notificationRepository } from "./notification.repository.js";
import { resolveNotificationTarget } from "./notification.targets.js";
import type {
  BroadcastNotificationInput,
  CreateIndividualNotificationInput,
  NotificationChannelChanges,
  NotificationFeedCursor,
  NotificationMetadata,
  NotificationPage,
  NotificationPreferenceView,
  NotificationRecord,
  RetractGroupActorInput,
  UpsertGroupInput,
} from "./notification.types.js";
import { toBroadcastPayload } from "./notification.utils.js";

const NOT_FOUND_STATUS = 404;

const broadcastCreated = (record: NotificationRecord): Promise<void> =>
  eventBus.publish(DomainEvents.NOTIFICATION_CREATED, toBroadcastPayload(record));

const broadcastUpdated = (record: NotificationRecord): Promise<void> =>
  eventBus.publish(DomainEvents.NOTIFICATION_UPDATED, toBroadcastPayload(record));

export const notificationService = {
  async notifyIndividual(input: CreateIndividualNotificationInput): Promise<void> {
    if (input.actorId && input.actorId === input.recipientId) return;

    const mutedRecipientIds = await notificationRepository.findMutedRecipientIds(
      [input.recipientId],
      input.type,
    );
    if (mutedRecipientIds.has(input.recipientId)) return;

    const record = await notificationRepository.createIndividual(input);
    if (record) await broadcastCreated(record);
  },

  async notifyManyIndividual(inputs: CreateIndividualNotificationInput[]): Promise<void> {
    const firstInput = inputs[0];
    if (!firstInput) return;

    const recipientIds = inputs.map((input) => input.recipientId);
    const mutedRecipientIds = await notificationRepository.findMutedRecipientIds(
      recipientIds,
      firstInput.type,
    );

    for (const input of inputs) {
      if (input.actorId && input.actorId === input.recipientId) continue;
      if (mutedRecipientIds.has(input.recipientId)) continue;

      const record = await notificationRepository.createIndividual(input);
      if (record) await broadcastCreated(record);
    }
  },

  async notifyBroadcast(input: BroadcastNotificationInput): Promise<number> {
    if (input.recipientIds.length === 0) return 0;

    const mutedRecipientIds = await notificationRepository.findMutedRecipientIds(
      input.recipientIds,
      input.type,
    );
    const eligibleRecipientIds = input.recipientIds.filter(
      (recipientId) => !mutedRecipientIds.has(recipientId),
    );
    if (eligibleRecipientIds.length === 0) return 0;

    const target = resolveNotificationTarget({
      type: input.type,
      entityId: input.entityId ?? null,
      metadata: input.metadata,
    });

    const records = await notificationRepository.createManyForBroadcast(
      eligibleRecipientIds.map((recipientId) => ({
        recipientId,
        type: input.type,
        entityType: input.entityType,
        entityId: input.entityId,
        targetSurface: target?.surface ?? null,
        targetPath: target?.path ?? null,
        metadata: input.metadata,
      })),
    );

    for (const record of records) await broadcastCreated(record);
    return records.length;
  },

  async notifyGroup(input: UpsertGroupInput): Promise<void> {
    if (input.actorId === input.recipientId) return;

    const mutedRecipientIds = await notificationRepository.findMutedRecipientIds(
      [input.recipientId],
      input.type,
    );
    if (mutedRecipientIds.has(input.recipientId)) return;

    const result = await notificationRepository.upsertGroup(input);
    if (!result) return;

    await (result.wasCreated ? broadcastCreated(result.record) : broadcastUpdated(result.record));
  },

  async notifySystemReminder(input: {
    recipientId: string;
    type: NotificationType;
    entityType?: NotificationEntityType | null;
    entityId?: string | null;
    groupKey: string;
    metadata: NotificationMetadata;
  }): Promise<void> {
    const mutedRecipientIds = await notificationRepository.findMutedRecipientIds(
      [input.recipientId],
      input.type,
    );
    if (mutedRecipientIds.has(input.recipientId)) return;

    const result = await notificationRepository.upsertSystemReminder(input);
    if (!result) return;

    await (result.wasCreated ? broadcastCreated(result.record) : broadcastUpdated(result.record));
  },

  async retractGroupActor(input: RetractGroupActorInput): Promise<void> {
    if (input.actorId === input.recipientId) return;

    const record = await notificationRepository.retractGroupActor(input);
    if (record) await broadcastUpdated(record);
  },

  async listFeed(
    recipientId: string,
    params: { cursor?: string; limit: number },
  ): Promise<NotificationPage> {
    const rows = await notificationRepository.listForRecipient(recipientId, params);
    const { items, nextCursor } = buildCursorPage(rows, params.limit, (row) =>
      encodeCursor<NotificationFeedCursor>({ updatedAt: row.updatedAt.toISOString(), id: row.id }),
    );
    return { notifications: items, nextCursor };
  },

  async getUnreadCount(recipientId: string): Promise<number> {
    return notificationRepository.countUnread(recipientId);
  },

  async markRead(recipientId: string, notificationId: string): Promise<void> {
    const record = await notificationRepository.markRead(recipientId, notificationId);
    if (!record) throw new AppError("NOT_FOUND", "Notification not found.", NOT_FOUND_STATUS);

    try {
      getIO().to(userRoom(recipientId)).emit(SOCKET_EVENTS.NOTIFICATION_READ, { id: record.id });
    } catch (error) {
      logger.error(
        `Failed to broadcast notification:read for user ${recipientId}: ${describeError(error)}`,
      );
    }
  },

  async markAllRead(recipientId: string): Promise<void> {
    const readAt = await notificationRepository.markAllRead(recipientId);

    try {
      getIO()
        .to(userRoom(recipientId))
        .emit(SOCKET_EVENTS.NOTIFICATION_READ_ALL, { readAt: readAt.toISOString() });
    } catch (error) {
      logger.error(
        `Failed to broadcast notification:read-all for user ${recipientId}: ${describeError(error)}`,
      );
    }
  },

  async listPreferences(userId: string): Promise<NotificationPreferenceView[]> {
    const overrides = await notificationRepository.listPreferenceOverrides(userId);
    return Object.values(NotificationType).map((type) => ({
      type,
      enabled: overrides.get(type)?.enabled ?? true,
      pushEnabled: overrides.get(type)?.pushEnabled ?? true,
    }));
  },

  async setPreference(
    userId: string,
    type: NotificationType,
    changes: NotificationChannelChanges,
  ): Promise<void> {
    await notificationRepository.setPreference(userId, type, changes);
  },
};
