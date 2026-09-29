import { subscribeToDomainEvent } from "#events/event-bus.consumer.js";
import { DomainEvents } from "#events/event-bus.js";
import { MessageKind, NotificationEntityType, NotificationType } from "#generated/prisma/enums.js";
import logger from "#lib/winston.utils.js";
import { notificationService } from "#modules/notifications/notification.service.js";
import { describeError } from "#redis/redis.utils.js";
import { conversationRoom, SOCKET_EVENTS, userRoom } from "#socket/socket.keys.js";
import { isUserOnline } from "#socket/socket.presence.js";
import { getIO } from "#socket/socket.server.js";
import type { ConversationSubscriptionPayload } from "#socket/socket.types.js";

import { CHAT_SOCKET_CONSUMER_GROUP } from "./chat.constants.js";
import { conversationRepository } from "./conversation.repository.js";
import {
  describeSystemEvent,
  messagePreviewFor,
  parseSystemEvent,
  usersNotifiedBySystemEvent,
} from "./message.utils.js";

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

      const systemEvent = parseSystemEvent(payload.systemEvent);
      const isSystemMessage = payload.kind === MessageKind.SYSTEM;
      const notifiedRecipientIds = isSystemMessage
        ? usersNotifiedBySystemEvent(systemEvent)
        : payload.recipientIds;
      const messagePreview =
        isSystemMessage && systemEvent
          ? describeSystemEvent(systemEvent, payload.senderName)
          : messagePreviewFor(payload.body);

      for (const recipientId of notifiedRecipientIds) {
        try {
          if (await isUserOnline(recipientId)) continue;

          await notificationService.notifyIndividual({
            recipientId,
            actorId: payload.senderId,
            type: NotificationType.NEW_MESSAGE,
            entityType: NotificationEntityType.CONVERSATION,
            entityId: payload.conversationId,
            metadata: { messagePreview },
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

export const registerConversationMembershipConsumer = (): void => {
  subscribeToDomainEvent({
    event: DomainEvents.CONVERSATION_MEMBER_REMOVED,
    groupName: CHAT_SOCKET_CONSUMER_GROUP,
    handler: async ({ conversationId, userId }): Promise<void> => {
      try {
        getIO().in(userRoom(userId)).socketsLeave(conversationRoom(conversationId));
        getIO().to(userRoom(userId)).emit(SOCKET_EVENTS.CONVERSATION_REMOVED, { conversationId });
      } catch (error) {
        logger.error(
          `Failed to remove ${userId} from conversation ${conversationId} sockets: ${describeError(error)}`,
        );
      }
    },
  });
};

export const registerPresenceSocketConsumer = (): void => {
  subscribeToDomainEvent({
    event: DomainEvents.PRESENCE_CHANGED,
    groupName: CHAT_SOCKET_CONSUMER_GROUP,
    handler: async (payload): Promise<void> => {
      try {
        const conversationIds = await conversationRepository.listConversationIdsForUser(
          payload.userId,
        );
        for (const conversationId of conversationIds) {
          getIO()
            .to(conversationRoom(conversationId))
            .emit(SOCKET_EVENTS.PRESENCE_CHANGED, payload);
        }
      } catch (error) {
        logger.error(
          `Failed to broadcast presence:changed for user ${payload.userId}: ${describeError(error)}`,
        );
      }
    },
  });
};
