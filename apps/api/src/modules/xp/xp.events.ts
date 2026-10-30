import { subscribeToDomainEvent } from "#events/event-bus.consumer.js";
import { DomainEvents } from "#events/event-bus.js";
import { CreatorStatus, XpActivityType } from "#generated/prisma/enums.js";
import { userRepository } from "#modules/users/user.repository.js";

import { XP_SOURCE } from "./xp.constants.js";
import { xpService } from "./xp.service.js";

const XP_CONSUMER_GROUP = "xp-award";

const isApprovedCreator = async (userId: string): Promise<boolean> => {
  const user = await userRepository.findById(userId);
  return Boolean(user?.isCreator) && user?.creatorStatus === CreatorStatus.APPROVED;
};

const subscribeToLookCreated = (): void => {
  subscribeToDomainEvent({
    event: DomainEvents.LOOK_CREATED,
    groupName: XP_CONSUMER_GROUP,
    handler: async ({ lookId, creatorId }): Promise<void> => {
      await xpService.awardXp({
        userId: creatorId,
        activityType: XpActivityType.LOOK_CREATED,
        relatedEntityId: lookId,
        source: XP_SOURCE.CREATOR_LOOKS,
      });
    },
  });
};

const subscribeToLookLiked = (): void => {
  subscribeToDomainEvent({
    event: DomainEvents.LOOK_LIKED,
    groupName: XP_CONSUMER_GROUP,
    handler: async ({ lookId, creatorId, userId: likerId }): Promise<void> => {
      if (likerId === creatorId) return;

      await xpService.awardXp({
        userId: creatorId,
        activityType: XpActivityType.LOOK_LIKE_RECEIVED,
        relatedEntityId: lookId,
        source: XP_SOURCE.CREATOR_LOOKS,
        metadata: { likedBy: likerId },
      });
    },
  });
};

const subscribeToLookSaved = (): void => {
  subscribeToDomainEvent({
    event: DomainEvents.LOOK_SAVED,
    groupName: XP_CONSUMER_GROUP,
    handler: async ({ lookId, userId: saverId }): Promise<void> => {
      await xpService.awardXp({
        userId: saverId,
        activityType: XpActivityType.LOOK_SAVED,
        relatedEntityId: lookId,
        source: XP_SOURCE.CREATOR_LOOKS,
      });
    },
  });
};

const subscribeToLookCommented = (): void => {
  subscribeToDomainEvent({
    event: DomainEvents.LOOK_COMMENTED,
    groupName: XP_CONSUMER_GROUP,
    handler: async ({ lookId, creatorId, userId: commenterId }): Promise<void> => {
      await xpService.awardXp({
        userId: commenterId,
        activityType: XpActivityType.LOOK_COMMENTED,
        relatedEntityId: lookId,
        source: XP_SOURCE.CREATOR_LOOKS,
      });

      if (commenterId === creatorId) return;

      await xpService.awardXp({
        userId: creatorId,
        activityType: XpActivityType.LOOK_COMMENT_RECEIVED,
        relatedEntityId: lookId,
        source: XP_SOURCE.CREATOR_LOOKS,
        metadata: { commentedBy: commenterId },
      });
    },
  });
};

const subscribeToUserFollowed = (): void => {
  subscribeToDomainEvent({
    event: DomainEvents.USER_FOLLOWED,
    groupName: XP_CONSUMER_GROUP,
    handler: async ({ followerId, followingId }): Promise<void> => {
      if (!(await isApprovedCreator(followingId))) return;

      await xpService.awardXp({
        userId: followerId,
        activityType: XpActivityType.USER_FOLLOWED,
        relatedEntityId: followingId,
        source: XP_SOURCE.FOLLOWS,
      });
    },
  });
};

const subscribeToProductPurchased = (): void => {
  subscribeToDomainEvent({
    event: DomainEvents.PRODUCT_PURCHASED,
    groupName: XP_CONSUMER_GROUP,
    handler: async ({ orderId, userId: buyerId }): Promise<void> => {
      await xpService.awardXp({
        userId: buyerId,
        activityType: XpActivityType.PRODUCT_PURCHASED,
        relatedEntityId: orderId,
        source: XP_SOURCE.PAYMENTS,
      });
    },
  });
};

const subscribeToSaleGenerated = (): void => {
  subscribeToDomainEvent({
    event: DomainEvents.SALE_GENERATED,
    groupName: XP_CONSUMER_GROUP,
    handler: async ({ orderItemId, creatorId, commissionAmount }): Promise<void> => {
      await xpService.awardXp({
        userId: creatorId,
        activityType: XpActivityType.SALE_GENERATED,
        relatedEntityId: orderItemId,
        source: XP_SOURCE.COMMISSIONS,
        metadata: { commissionAmount },
      });
    },
  });
};

const subscribeToProductTagged = (): void => {
  subscribeToDomainEvent({
    event: DomainEvents.PRODUCT_TAGGED,
    groupName: XP_CONSUMER_GROUP,
    handler: async ({ lookId, creatorId, productId }): Promise<void> => {
      await xpService.awardXp({
        userId: creatorId,
        activityType: XpActivityType.PRODUCT_TAGGED,
        relatedEntityId: productId,
        source: XP_SOURCE.CREATOR_LOOKS,
        metadata: { lookId },
      });
    },
  });
};

export const registerXpEventConsumers = (): void => {
  subscribeToLookCreated();
  subscribeToLookLiked();
  subscribeToLookSaved();
  subscribeToLookCommented();
  subscribeToUserFollowed();
  subscribeToProductPurchased();
  subscribeToSaleGenerated();
  subscribeToProductTagged();
};
