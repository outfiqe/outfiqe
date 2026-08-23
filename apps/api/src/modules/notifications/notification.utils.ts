import type { NotificationBroadcastPayload } from "#events/event-bus.types.js";
import type { NotificationEntityType, NotificationType } from "#generated/prisma/enums.js";

import { MAX_RECENT_ACTORS } from "./notification.constants.js";
import type {
  NotificationActorSnapshot,
  NotificationMetadata,
  NotificationRecord,
} from "./notification.types.js";

type PrismaNotificationRow = {
  id: string;
  recipientId: string;
  actorId: string | null;
  type: NotificationType;
  entityType: NotificationEntityType | null;
  entityId: string | null;
  metadata: unknown;
  groupKey: string | null;
  actorCount: number;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export const toNotificationRecord = (row: PrismaNotificationRow): NotificationRecord => ({
  id: row.id,
  recipientId: row.recipientId,
  actorId: row.actorId,
  type: row.type,
  entityType: row.entityType,
  entityId: row.entityId,
  metadata: (row.metadata ?? {}) as NotificationMetadata,
  groupKey: row.groupKey,
  actorCount: row.actorCount,
  isRead: row.isRead,
  readAt: row.readAt,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export const mergeRecentActors = (
  existing: NotificationActorSnapshot[],
  newActor: NotificationActorSnapshot,
  cap: number = MAX_RECENT_ACTORS,
): NotificationActorSnapshot[] => {
  const deduped = existing.filter((actor) => actor.id !== newActor.id);
  return [newActor, ...deduped].slice(0, cap);
};

export const removeRecentActor = (
  existing: NotificationActorSnapshot[],
  actorId: string,
): NotificationActorSnapshot[] => existing.filter((actor) => actor.id !== actorId);

export const toBroadcastPayload = (record: NotificationRecord): NotificationBroadcastPayload => ({
  id: record.id,
  recipientId: record.recipientId,
  actorId: record.actorId,
  type: record.type,
  entityType: record.entityType,
  entityId: record.entityId,
  metadata: record.metadata,
  groupKey: record.groupKey,
  actorCount: record.actorCount,
  isRead: record.isRead,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});
