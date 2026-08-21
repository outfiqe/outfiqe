import { subscribeToDomainEvent } from "#events/event-bus.consumer.js";
import { DomainEvents } from "#events/event-bus.js";

import { achievementService } from "./achievement.service.js";

const ACHIEVEMENT_CONSUMER_GROUP = "achievement-check";

export const registerAchievementEventConsumers = (): void => {
  subscribeToDomainEvent({
    event: DomainEvents.LOOK_CREATED,
    groupName: ACHIEVEMENT_CONSUMER_GROUP,
    handler: async ({ creatorId }): Promise<void> => {
      await achievementService.evaluateForUser(creatorId);
    },
  });

  subscribeToDomainEvent({
    event: DomainEvents.LOOK_LIKED,
    groupName: ACHIEVEMENT_CONSUMER_GROUP,
    handler: async ({ creatorId }): Promise<void> => {
      await achievementService.evaluateForUser(creatorId);
    },
  });

  subscribeToDomainEvent({
    event: DomainEvents.LOOK_COMMENTED,
    groupName: ACHIEVEMENT_CONSUMER_GROUP,
    handler: async ({ userId: commenterId }): Promise<void> => {
      await achievementService.evaluateForUser(commenterId);
    },
  });

  subscribeToDomainEvent({
    event: DomainEvents.PRODUCT_PURCHASED,
    groupName: ACHIEVEMENT_CONSUMER_GROUP,
    handler: async ({ userId: buyerId }): Promise<void> => {
      await achievementService.evaluateForUser(buyerId);
    },
  });

  subscribeToDomainEvent({
    event: DomainEvents.SALE_GENERATED,
    groupName: ACHIEVEMENT_CONSUMER_GROUP,
    handler: async ({ creatorId }): Promise<void> => {
      await achievementService.evaluateForUser(creatorId);
    },
  });

  subscribeToDomainEvent({
    event: DomainEvents.LOOK_VIEWED,
    groupName: ACHIEVEMENT_CONSUMER_GROUP,
    handler: async ({ creatorId }): Promise<void> => {
      await achievementService.evaluateForUser(creatorId);
    },
  });
};
