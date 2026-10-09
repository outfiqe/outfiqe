import { HTTP_STATUS } from "#constants/http.constants.js";
import { DomainEvents, eventBus } from "#events/event-bus.js";
import { ConversationType } from "#generated/prisma/enums.js";
import { buildCursorPage } from "#lib/pagination.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { isUserOnline } from "#socket/socket.presence.js";

import { chatService } from "./chat.service.js";
import { chatUnavailableError } from "./chat.utils.js";
import { conversationRepository } from "./conversation.repository.js";
import { requireParticipant } from "./conversation.service.js";
import { messageRepository } from "./message.repository.js";
import type { MessageRecord, MessagesPage, NewMessageAttachmentInput } from "./message.types.js";
import {
  combineReaderCursors,
  conversationPreviewFor,
  toMessageBroadcast,
  toMessageRecord,
} from "./message.utils.js";

const assertCanSendTo = async (
  callerId: string,
  conversationId: string,
  conversationType: ConversationType,
): Promise<void> => {
  if (conversationType === ConversationType.GROUP) {
    const availability = await chatService.resolveOwnChatAvailability(callerId);
    if (!availability.isAvailable) throw chatUnavailableError(availability.reason);
    return;
  }

  const otherParticipant = await conversationRepository.findOtherParticipant(
    conversationId,
    callerId,
  );
  if (!otherParticipant) return;
  const availability = await chatService.resolveChatAvailability(callerId, otherParticipant.userId);
  if (!availability.isAvailable) throw chatUnavailableError(availability.reason);
};

export const messageService = {
  async sendMessage(
    callerId: string,
    conversationId: string,
    body: string | undefined,
    attachments: NewMessageAttachmentInput[],
  ): Promise<MessageRecord> {
    const trimmedBody = body?.trim() || null;
    if (!trimmedBody && attachments.length === 0) {
      throw new AppError(
        "EMPTY_MESSAGE",
        "A message needs text or at least one photo.",
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    await requireParticipant(conversationId, callerId);

    const conversation = await conversationRepository.getById(conversationId);
    if (!conversation) {
      throw new AppError("NOT_FOUND", "Conversation not found.", HTTP_STATUS.NOT_FOUND);
    }
    await assertCanSendTo(callerId, conversationId, conversation.type);

    const groupSenderName =
      conversation.type === ConversationType.GROUP
        ? (conversation.participants.find(({ userId }) => userId === callerId)?.user.name ?? null)
        : null;
    const message = await messageRepository.send(
      conversationId,
      callerId,
      trimmedBody,
      attachments,
      conversationPreviewFor(trimmedBody, groupSenderName),
    );

    const recipientIds = conversation.participants
      .map((participant) => participant.userId)
      .filter((participantId) => participantId !== callerId);

    await eventBus.publish(DomainEvents.MESSAGE_CREATED, toMessageBroadcast(message, recipientIds));

    await Promise.all(
      recipientIds.map(async (recipientId) => {
        if (await isUserOnline(recipientId)) {
          await messageRepository.markDelivered(
            conversationId,
            recipientId,
            message.id,
            message.createdAt,
          );
        }
      }),
    );

    return toMessageRecord(message, callerId, null);
  },

  async listMessages(
    callerId: string,
    conversationId: string,
    query: { cursor?: string; limit: number },
  ): Promise<MessagesPage> {
    await requireParticipant(conversationId, callerId);

    const [rows, otherReaderCursors] = await Promise.all([
      messageRepository.listForConversation(conversationId, query),
      messageRepository.listOtherReaderCursors(conversationId, callerId),
    ]);
    const { items, nextCursor } = buildCursorPage(rows, query.limit, (row) => row.id);

    if (!query.cursor) {
      const latestMessageId = await messageRepository.findLatestId(conversationId);
      if (latestMessageId) {
        await messageRepository.markDelivered(
          conversationId,
          callerId,
          latestMessageId,
          new Date(),
        );
      }
    }

    const otherReaders = combineReaderCursors(otherReaderCursors);
    return {
      items: items.map((row) => toMessageRecord(row, callerId, otherReaders)),
      nextCursor,
    };
  },

  async markRead(callerId: string, conversationId: string): Promise<void> {
    await requireParticipant(conversationId, callerId);
    const latestMessageId = await messageRepository.findLatestId(conversationId);
    await messageRepository.markRead(conversationId, callerId, latestMessageId, new Date());
  },
};
