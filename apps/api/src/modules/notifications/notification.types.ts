import type { NotificationEntityType, NotificationType } from "#generated/prisma/enums.js";

export type NotificationActorSnapshot = {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string | null;
};

export type NotificationMetadata = {
  actor?: NotificationActorSnapshot;
  recentActors?: NotificationActorSnapshot[];
  lookImageUrl?: string;
  lookCaption?: string | null;
  badgeName?: string;
  badgeIcon?: string;
  xpReward?: number;
  levelName?: string;
  levelIcon?: string | null;
  commissionAmount?: number;
  orderTotal?: number;
  brandName?: string;
  status?: string;
};

export type NotificationRecord = {
  id: string;
  recipientId: string;
  actorId: string | null;
  type: NotificationType;
  entityType: NotificationEntityType | null;
  entityId: string | null;
  metadata: NotificationMetadata;
  groupKey: string | null;
  actorCount: number;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateIndividualNotificationInput = {
  recipientId: string;
  actorId?: string | null;
  type: NotificationType;
  entityType?: NotificationEntityType | null;
  entityId?: string | null;
  metadata: NotificationMetadata;
};

export type UpsertGroupInput = {
  recipientId: string;
  actorId: string;
  actor: NotificationActorSnapshot;
  type: NotificationType;
  entityType?: NotificationEntityType | null;
  entityId?: string | null;
  groupKey: string;
  metadata: NotificationMetadata;
};

export type RetractGroupActorInput = {
  recipientId: string;
  groupKey: string;
  actorId: string;
};

export type NotificationPage = {
  notifications: NotificationRecord[];
  nextCursor: string | null;
};
