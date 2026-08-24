import { ConversationType } from "#generated/prisma/enums.js";
import { buildCursorPage } from "#lib/pagination.utils.js";
import { AppError } from "#middlewares/error-handler.js";

import { chatService } from "./chat.service.js";
import { conversationRepository } from "./conversation.repository.js";
import { requireParticipant } from "./conversation.service.js";
import { messageRepository } from "./message.repository.js";
import type { MessageRecord, MessagesPage, NewMessageAttachmentInput } from "./message.types.js";
import { toMessageRecord } from "./message.utils.js";

const NOT_FOUND_STATUS = 404;
const FORBIDDEN_STATUS = 403;
const BAD_REQUEST_STATUS = 400;

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
        BAD_REQUEST_STATUS,
      );
    }

    await requireParticipant(conversationId, callerId);

    const conversation = await conversationRepository.getById(conversationId);
    if (!conversation) {
      throw new AppError("NOT_FOUND", "Conversation not found.", NOT_FOUND_STATUS);
    }

    if (conversation.type === ConversationType.DIRECT) {
      const otherParticipant = await conversationRepository.findOtherParticipant(
        conversationId,
        callerId,
      );
      if (otherParticipant) {
        const available = await chatService.isChatAvailableBetween(
          callerId,
          otherParticipant.userId,
        );
        if (!available) {
          throw new AppError(
            "CHAT_UNAVAILABLE",
            "You can't message this person right now.",
            FORBIDDEN_STATUS,
          );
        }
      }
    }

    const message = await messageRepository.send(
      conversationId,
      callerId,
      trimmedBody,
      attachments,
    );
    return toMessageRecord(message, callerId, null);
  },

  async listMessages(
    callerId: string,
    conversationId: string,
    query: { cursor?: string; limit: number },
  ): Promise<MessagesPage> {
    await requireParticipant(conversationId, callerId);

    const [rows, otherParticipant] = await Promise.all([
      messageRepository.listForConversation(conversationId, query),
      conversationRepository.findOtherParticipant(conversationId, callerId),
    ]);
    const { items, nextCursor } = buildCursorPage(rows, query.limit, (row) => row.id);

    return {
      items: items.map((row) =>
        toMessageRecord(row, callerId, otherParticipant?.lastReadAt ?? null),
      ),
      nextCursor,
    };
  },

  async markRead(callerId: string, conversationId: string): Promise<void> {
    await requireParticipant(conversationId, callerId);
    const latestMessageId = await messageRepository.findLatestId(conversationId);
    await messageRepository.markRead(conversationId, callerId, latestMessageId, new Date());
  },
};
