import { subscribeToDomainEvent } from "#events/event-bus.consumer.js";
import { DomainEvents } from "#events/event-bus.js";

import { achievementService } from "./achievement.service.js";

const ACHIEVEMENT_CONSUMER_GROUP = "achievement-check";

const subscribeToLookCreated = (): void => {
  subscribeToDomainEvent({
    event: DomainEvents.LOOK_CREATED,
    groupName: ACHIEVEMENT_CONSUMER_GROUP,
    handler: async ({ creatorId }): Promise<void> => {
      await achievementService.evaluateForUser(creatorId);
    },
  });
};

const subscribeToLookLiked = (): void => {
  subscribeToDomainEvent({
    event: DomainEvents.LOOK_LIKED,
    groupName: ACHIEVEMENT_CONSUMER_GROUP,
    handler: async ({ creatorId }): Promise<void> => {
      await achievementService.evaluateForUser(creatorId);
    },
  });
};

const subscribeToLookCommented = (): void => {
  subscribeToDomainEvent({
    event: DomainEvents.LOOK_COMMENTED,
    groupName: ACHIEVEMENT_CONSUMER_GROUP,
    handler: async ({ userId: commenterId }): Promise<void> => {
      await achievementService.evaluateForUser(commenterId);
    },
  });
};

const subscribeToProductPurchased = (): void => {
  subscribeToDomainEvent({
    event: DomainEvents.PRODUCT_PURCHASED,
    groupName: ACHIEVEMENT_CONSUMER_GROUP,
    handler: async ({ userId: buyerId }): Promise<void> => {
      await achievementService.evaluateForUser(buyerId);
    },
  });
};

const subscribeToSaleGenerated = (): void => {
  subscribeToDomainEvent({
    event: DomainEvents.SALE_GENERATED,
    groupName: ACHIEVEMENT_CONSUMER_GROUP,
    handler: async ({ creatorId }): Promise<void> => {
      await achievementService.evaluateForUser(creatorId);
    },
  });
};

const subscribeToLookViewed = (): void => {
  subscribeToDomainEvent({
    event: DomainEvents.LOOK_VIEWED,
    groupName: ACHIEVEMENT_CONSUMER_GROUP,
    handler: async ({ creatorId }): Promise<void> => {
      await achievementService.evaluateForUser(creatorId);
    },
  });
};

export const registerAchievementEventConsumers = (): void => {
  subscribeToLookCreated();
  subscribeToLookLiked();
  subscribeToLookCommented();
  subscribeToProductPurchased();
  subscribeToSaleGenerated();
  subscribeToLookViewed();
};
