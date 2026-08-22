import { subscribeToDomainEvent } from "#events/event-bus.consumer.js";
import { DomainEvents } from "#events/event-bus.js";
import logger from "#lib/winston.utils.js";
import { describeError } from "#redis/redis.utils.js";
import { SOCKET_EVENTS, userRoom } from "#socket/socket.keys.js";
import { getIO } from "#socket/socket.server.js";
import type { LevelUpPayload } from "#socket/socket.types.js";

const SOCKET_BROADCAST_CONSUMER_GROUP = "socket-broadcast";

export const registerXpSocketEventConsumer = (): void => {
  subscribeToDomainEvent({
    event: DomainEvents.LEVEL_UP,
    groupName: SOCKET_BROADCAST_CONSUMER_GROUP,
    handler: async ({ userId, previousLevel, currentLevel }): Promise<void> => {
      try {
        const payload: LevelUpPayload = { previousLevel, currentLevel };
        getIO().to(userRoom(userId)).emit(SOCKET_EVENTS.LEVEL_UP, payload);
      } catch (error) {
        logger.error(`Failed to broadcast level-up for user ${userId}: ${describeError(error)}`);
      }
    },
  });
};
