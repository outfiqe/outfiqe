import { NotificationType } from "#generated/prisma/enums.js";

export const GROUPABLE_NOTIFICATION_TYPES: ReadonlySet<NotificationType> = new Set([
  NotificationType.LOOK_LIKED,
  NotificationType.NEW_FOLLOWER,
  NotificationType.NEW_BRAND_FOLLOWER,
]);

export const MAX_RECENT_ACTORS = 3;

export const NOTIFICATION_CONSUMER_GROUP = "notification-write";
export const NOTIFICATION_SOCKET_CONSUMER_GROUP = "socket-broadcast";

/**
 * Notifications whose read state carries real business/money weight get a
 * longer retention window once read — see notifications/README.md and
 * notification.retention.ts. Unread rows are never touched by the sweep,
 * regardless of type.
 */
export const CRITICAL_RETENTION_NOTIFICATION_TYPES: ReadonlySet<NotificationType> = new Set([
  NotificationType.NEW_ORDER,
  NotificationType.ORDER_STATUS_CHANGED,
  NotificationType.COMMISSION_EARNED,
  NotificationType.BRAND_APPLICATION_SUBMITTED,
]);

export const STANDARD_READ_RETENTION_DAYS = 90;
export const CRITICAL_READ_RETENTION_DAYS = 180;
export const NOTIFICATION_RETENTION_SWEEP_INTERVAL_MS = 24 * 60 * 60 * 1000;

export const NOTIFICATION_GROUP_KEYS = {
  lookLiked: (lookId: string): string => `look-liked:${lookId}`,
  newFollower: (): string => "new-follower",
  newBrandFollower: (): string => "new-brand-follower",
} as const;
