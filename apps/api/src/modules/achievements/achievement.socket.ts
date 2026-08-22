import { subscribeToDomainEvent } from "#events/event-bus.consumer.js";
import { DomainEvents } from "#events/event-bus.js";
import logger from "#lib/winston.utils.js";
import { describeError } from "#redis/redis.utils.js";
import { SOCKET_EVENTS, userRoom } from "#socket/socket.keys.js";
import { getIO } from "#socket/socket.server.js";
import type { AchievementUnlockedPayload } from "#socket/socket.types.js";

const SOCKET_BROADCAST_CONSUMER_GROUP = "socket-broadcast";

export const registerAchievementSocketEventConsumer = (): void => {
  subscribeToDomainEvent({
    event: DomainEvents.ACHIEVEMENT_UNLOCKED,
    groupName: SOCKET_BROADCAST_CONSUMER_GROUP,
    handler: async ({
      userId,
      badgeId,
      badgeName,
      badgeIcon,
      xpReward,
      sponsorBrandName,
    }): Promise<void> => {
      try {
        const payload: AchievementUnlockedPayload = {
          badgeId,
          badgeName,
          badgeIcon,
          xpReward,
          sponsorBrandName,
        };
        getIO().to(userRoom(userId)).emit(SOCKET_EVENTS.ACHIEVEMENT_UNLOCKED, payload);
      } catch (error) {
        logger.error(
          `Failed to broadcast achievement unlock for user ${userId}: ${describeError(error)}`,
        );
      }
    },
  });
};
