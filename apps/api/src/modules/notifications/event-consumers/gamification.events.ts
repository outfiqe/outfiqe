import { subscribeToDomainEvent } from "#events/event-bus.consumer.js";
import { DomainEvents } from "#events/event-bus.js";
import { NotificationEntityType, NotificationType } from "#generated/prisma/enums.js";

import { NOTIFICATION_CONSUMER_GROUP } from "../notification.constants.js";
import { notificationService } from "../notification.service.js";

const subscribeToAchievementUnlocked = (): void => {
  subscribeToDomainEvent({
    event: DomainEvents.ACHIEVEMENT_UNLOCKED,
    groupName: NOTIFICATION_CONSUMER_GROUP,
    handler: async (
      { userId, badgeId, badgeName, badgeIcon, xpReward },
      { eventId },
    ): Promise<void> => {
      await notificationService.notifyIndividual({
        recipientId: userId,
        type: NotificationType.ACHIEVEMENT_UNLOCKED,
        sourceEventId: eventId,
        entityType: NotificationEntityType.BADGE,
        entityId: badgeId,
        metadata: { badgeName, badgeIcon, xpReward },
      });
    },
  });
};

const subscribeToLevelUp = (): void => {
  subscribeToDomainEvent({
    event: DomainEvents.LEVEL_UP,
    groupName: NOTIFICATION_CONSUMER_GROUP,
    handler: async ({ userId, currentLevel }, { eventId }): Promise<void> => {
      await notificationService.notifyIndividual({
        recipientId: userId,
        type: NotificationType.LEVEL_UP,
        sourceEventId: eventId,
        metadata: { levelName: currentLevel.name, levelIcon: currentLevel.icon },
      });
    },
  });
};

export const registerGamificationNotificationConsumers = (): void => {
  subscribeToAchievementUnlocked();
  subscribeToLevelUp();
};
