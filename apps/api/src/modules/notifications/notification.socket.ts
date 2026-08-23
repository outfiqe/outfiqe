import { subscribeToDomainEvent } from "#events/event-bus.consumer.js";
import { DomainEvents } from "#events/event-bus.js";
import logger from "#lib/winston.utils.js";
import { describeError } from "#redis/redis.utils.js";
import { SOCKET_EVENTS, userRoom } from "#socket/socket.keys.js";
import { getIO } from "#socket/socket.server.js";

import { NOTIFICATION_SOCKET_CONSUMER_GROUP } from "./notification.constants.js";

export const registerNotificationSocketEventConsumer = (): void => {
  subscribeToDomainEvent({
    event: DomainEvents.NOTIFICATION_CREATED,
    groupName: NOTIFICATION_SOCKET_CONSUMER_GROUP,
    handler: async (payload): Promise<void> => {
      try {
        getIO().to(userRoom(payload.recipientId)).emit(SOCKET_EVENTS.NOTIFICATION_CREATED, payload);
      } catch (error) {
        logger.error(
          `Failed to broadcast notification:created for user ${payload.recipientId}: ${describeError(error)}`,
        );
      }
    },
  });

  subscribeToDomainEvent({
    event: DomainEvents.NOTIFICATION_UPDATED,
    groupName: NOTIFICATION_SOCKET_CONSUMER_GROUP,
    handler: async (payload): Promise<void> => {
      try {
        getIO().to(userRoom(payload.recipientId)).emit(SOCKET_EVENTS.NOTIFICATION_UPDATED, payload);
      } catch (error) {
        logger.error(
          `Failed to broadcast notification:updated for user ${payload.recipientId}: ${describeError(error)}`,
        );
      }
    },
  });
};
