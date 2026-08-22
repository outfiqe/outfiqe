import type { LeaderboardCategory } from "#constants/leaderboard.constants.js";
import type { CreatorLeaderboardCategory, UserRole } from "#generated/prisma/enums.js";

import type { DomainEvents } from "./event-bus.js";

export type DomainEvent = (typeof DomainEvents)[keyof typeof DomainEvents];

type FollowPayload = { followerId: string; followingId: string };

export type DomainEventPayloads = {
  [DomainEvents.USER_CREATED]: { userId: string; email: string; role?: UserRole };
  [DomainEvents.USER_DELETED]: { userId: string };
  [DomainEvents.USER_EMAIL_VERIFIED]: { userId: string; email: string };
  [DomainEvents.USER_PASSWORD_RESET]: { userId: string };
  [DomainEvents.BRAND_OWNER_REGISTERED]: { userId: string; brandId: string; email: string };
  [DomainEvents.ADMIN_REGISTERED]: { userId: string; email: string };
  [DomainEvents.LOOK_CREATED]: { lookId: string; creatorId: string; createdAt: string };
  [DomainEvents.LOOK_LIKED]: { lookId: string; creatorId: string; userId: string };
  [DomainEvents.LOOK_SAVED]: { lookId: string; creatorId: string; userId: string };
  [DomainEvents.LOOK_COMMENTED]: {
    lookId: string;
    creatorId: string;
    commentId: string;
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
};

export type DomainEventHandler<E extends DomainEvent> = (
  payload: DomainEventPayloads[E],
) => Promise<void>;
