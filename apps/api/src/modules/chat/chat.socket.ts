import { subscribeToDomainEvent } from "#events/event-bus.consumer.js";
import { DomainEvents } from "#events/event-bus.js";
import logger from "#lib/winston.utils.js";
import { describeError } from "#redis/redis.utils.js";
import { SOCKET_EVENTS, userRoom } from "#socket/socket.keys.js";
import { getIO } from "#socket/socket.server.js";

import { CHAT_SOCKET_CONSUMER_GROUP } from "./chat.constants.js";

export const registerChatSocketEventConsumer = (): void => {
  subscribeToDomainEvent({
    event: DomainEvents.CHAT_SETTINGS_UPDATED,
    groupName: CHAT_SOCKET_CONSUMER_GROUP,
    handler: async (payload): Promise<void> => {
      try {
        getIO()
          .to(userRoom(payload.userId))
          .emit(SOCKET_EVENTS.CHAT_SETTINGS_UPDATED, { isChatEnabled: payload.isChatEnabled });
      } catch (error) {
        logger.error(
          `Failed to broadcast chat:settings:updated for user ${payload.userId}: ${describeError(error)}`,
        );
      }
    },
  });

  subscribeToDomainEvent({
    event: DomainEvents.CHAT_BLOCK_LIST_UPDATED,
    groupName: CHAT_SOCKET_CONSUMER_GROUP,
    handler: async (payload): Promise<void> => {
      try {
        getIO()
          .to(userRoom(payload.userId))
          .emit(SOCKET_EVENTS.CHAT_BLOCK_LIST_UPDATED, { updatedAt: new Date().toISOString() });
      } catch (error) {
        logger.error(
          `Failed to broadcast chat:block-list:updated for user ${payload.userId}: ${describeError(error)}`,
        );
      }
    },
  });
};
