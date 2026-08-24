import type { LeaderboardCategory } from "#constants/leaderboard.constants.js";
import type {
  CreatorLeaderboardCategory,
  FulfilmentStatus,
  NotificationEntityType,
  NotificationType,
  UserRole,
} from "#generated/prisma/enums.js";

import type { DomainEvents } from "./event-bus.js";

export type DomainEvent = (typeof DomainEvents)[keyof typeof DomainEvents];

type FollowPayload = { followerId: string; followingId: string };

export type NotificationBroadcastPayload = {
  id: string;
  recipientId: string;
  actorId: string | null;
  type: NotificationType;
  entityType: NotificationEntityType | null;
  entityId: string | null;
  metadata: Record<string, unknown>;
  groupKey: string | null;
  actorCount: number;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MessageBroadcastPayload = {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderHandle: string;
  senderAvatarUrl: string | null;
  body: string | null;
  hasAttachments: boolean;
  createdAt: string;
  recipientIds: string[];
};

export type DomainEventPayloads = {
  [DomainEvents.USER_CREATED]: { userId: string; email: string; role?: UserRole };
  [DomainEvents.USER_DELETED]: { userId: string };
  [DomainEvents.USER_EMAIL_VERIFIED]: { userId: string; email: string };
  [DomainEvents.USER_PASSWORD_RESET]: { userId: string };
  [DomainEvents.BRAND_OWNER_REGISTERED]: { userId: string; brandId: string; email: string };
  [DomainEvents.ADMIN_REGISTERED]: { userId: string; email: string };
  [DomainEvents.LOOK_CREATED]: { lookId: string; creatorId: string; createdAt: string };
  [DomainEvents.LOOK_LIKED]: { lookId: string; creatorId: string; userId: string };
  [DomainEvents.LOOK_UNLIKED]: { lookId: string; creatorId: string; userId: string };
  [DomainEvents.LOOK_SAVED]: { lookId: string; creatorId: string; userId: string };
  [DomainEvents.LOOK_COMMENTED]: {
    lookId: string;
    creatorId: string;
    commentId: string;
    userId: string;
  };
  [DomainEvents.LOOK_COMMENT_REPLIED]: {
    lookId: string;
    creatorId: string;
    parentCommentId: string;
    parentCommentAuthorId: string;
    replyId: string;
    userId: string;
  };
  [DomainEvents.LOOK_VIEWED]: { lookId: string; creatorId: string; viewerId?: string };
  [DomainEvents.USER_FOLLOWED]: FollowPayload;
  [DomainEvents.USER_UNFOLLOWED]: FollowPayload;
  [DomainEvents.BRAND_FOLLOWED]: FollowPayload;
  [DomainEvents.BRAND_UNFOLLOWED]: FollowPayload;
  [DomainEvents.LEADERBOARD_BRAND_UPDATED]: { category: LeaderboardCategory; week: string };
  [DomainEvents.LEADERBOARD_CREATOR_UPDATED]: {
    category: CreatorLeaderboardCategory;
    week: string;
  };
  [DomainEvents.PRODUCT_PURCHASED]: { orderId: string; userId: string };
  [DomainEvents.PRODUCT_TAGGED]: { lookId: string; creatorId: string; productId: string };
  [DomainEvents.SALE_GENERATED]: {
    orderItemId: string;
    creatorId: string;
    commissionAmount: number;
  };
  [DomainEvents.ACHIEVEMENT_UNLOCKED]: {
    userId: string;
    badgeId: string;
    badgeName: string;
    badgeIcon: string;
    xpReward: number;
    sponsorBrandName: string | null;
  };
  [DomainEvents.LEVEL_UP]: {
    userId: string;
    previousLevel: { level: number; name: string };
    currentLevel: { level: number; name: string; icon: string | null };
  };
  [DomainEvents.BRAND_APPLICATION_SUBMITTED]: { applicationId: string; brandName: string };
  [DomainEvents.ORDER_STATUS_CHANGED]: {
    orderId: string;
    userId: string;
    status: FulfilmentStatus;
  };
  [DomainEvents.PRODUCT_REVIEWED]: {
    productId: string;
    reviewId: string;
    userId: string;
    rating: number;
  };
  [DomainEvents.NOTIFICATION_CREATED]: NotificationBroadcastPayload;
  [DomainEvents.NOTIFICATION_UPDATED]: NotificationBroadcastPayload;
  [DomainEvents.CHAT_SETTINGS_UPDATED]: { userId: string; isChatEnabled: boolean };
  [DomainEvents.CHAT_BLOCK_LIST_UPDATED]: { userId: string };
  [DomainEvents.MESSAGE_CREATED]: MessageBroadcastPayload;
};

export type DomainEventHandler<E extends DomainEvent> = (
  payload: DomainEventPayloads[E],
) => Promise<void>;
