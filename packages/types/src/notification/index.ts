export type NotificationType =
  | "LOOK_LIKED"
  | "LOOK_COMMENTED"
  | "COMMENT_REPLIED"
  | "NEW_FOLLOWER"
  | "NEW_BRAND_FOLLOWER"
  | "ACHIEVEMENT_UNLOCKED"
  | "LEVEL_UP"
  | "COMMISSION_EARNED"
  | "NEW_ORDER"
  | "ORDER_STATUS_CHANGED"
  | "BRAND_APPLICATION_SUBMITTED"
  | "PRODUCT_REVIEWED"
  | "REVIEW_REQUESTED";

export type NotificationEntityType =
  "LOOK" | "USER" | "ORDER" | "BRAND_APPLICATION" | "BADGE" | "PRODUCT";

export type RecentActor = {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string | null;
};

export type NotificationMetadata = {
  actor?: RecentActor;
  recentActors?: RecentActor[];
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
  productName?: string;
  productImageUrl?: string | null;
  rating?: number;
};

export type Notification = {
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
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NotificationPage = {
  notifications: Notification[];
  nextCursor: string | null;
};

export type NotificationPreference = {
  type: NotificationType;
  enabled: boolean;
};
