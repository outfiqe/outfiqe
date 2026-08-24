import { subscribeToDomainEvent } from "#events/event-bus.consumer.js";
import { DomainEvents } from "#events/event-bus.js";
import { NotificationEntityType, NotificationType } from "#generated/prisma/enums.js";
import logger from "#lib/winston.utils.js";
import { notificationService } from "#modules/notifications/notification.service.js";
import { describeError } from "#redis/redis.utils.js";
import { conversationRoom, SOCKET_EVENTS, userRoom } from "#socket/socket.keys.js";
import { getIO } from "#socket/socket.server.js";
import type { ConversationSubscriptionPayload } from "#socket/socket.types.js";

import { CHAT_SOCKET_CONSUMER_GROUP } from "./chat.constants.js";
import { conversationRepository } from "./conversation.repository.js";
import { messagePreviewFor } from "./message.utils.js";

export const registerConversationSocketHandlers = (): void => {
  getIO().on("connection", (socket) => {
    socket.on(
      SOCKET_EVENTS.CONVERSATION_SUBSCRIBE,
      async ({ conversationId }: ConversationSubscriptionPayload) => {
        if (!conversationId || !socket.data.auth) return;
        try {
          const participant = await conversationRepository.findParticipant(
            conversationId,
            socket.data.auth.userId,
          );
          if (!participant) return;
          void socket.join(conversationRoom(conversationId));
        } catch (error) {
          logger.error(
            `Failed to subscribe socket to conversation ${conversationId}: ${describeError(error)}`,
          );
        }
      },
    );

    socket.on(
      SOCKET_EVENTS.CONVERSATION_UNSUBSCRIBE,
      ({ conversationId }: ConversationSubscriptionPayload) => {
        if (!conversationId) return;
        void socket.leave(conversationRoom(conversationId));
      },
    );
  });
};

const hasActiveConnection = async (userId: string): Promise<boolean> => {
  const sockets = await getIO().in(userRoom(userId)).fetchSockets();
  return sockets.length > 0;
};

export const registerMessageEventConsumer = (): void => {
  subscribeToDomainEvent({
    event: DomainEvents.MESSAGE_CREATED,
    groupName: CHAT_SOCKET_CONSUMER_GROUP,
    handler: async (payload): Promise<void> => {
      try {
        getIO()
          .to(conversationRoom(payload.conversationId))
          .emit(SOCKET_EVENTS.MESSAGE_CREATED, payload);
        for (const recipientId of payload.recipientIds) {
          getIO().to(userRoom(recipientId)).emit(SOCKET_EVENTS.CONVERSATION_UPDATED, payload);
        }
      } catch (error) {
        logger.error(
          `Failed to broadcast message:created for conversation ${payload.conversationId}: ${describeError(error)}`,
        );
      }

      for (const recipientId of payload.recipientIds) {
        try {
          const isOnline = await hasActiveConnection(recipientId);
          if (isOnline) continue;

          await notificationService.notifyIndividual({
            recipientId,
            actorId: payload.senderId,
            type: NotificationType.NEW_MESSAGE,
            entityType: NotificationEntityType.CONVERSATION,
            entityId: payload.conversationId,
            metadata: { messagePreview: messagePreviewFor(payload.body) },
          });
        } catch (error) {
          logger.error(
            `Failed to create offline message notification for ${recipientId}: ${describeError(error)}`,
          );
        }
      }
    },
  });
};
