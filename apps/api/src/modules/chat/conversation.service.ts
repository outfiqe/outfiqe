import { buildCursorPage } from "#lib/pagination.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { userRepository } from "#modules/users/user.repository.js";

import { chatService } from "./chat.service.js";
import { conversationRepository } from "./conversation.repository.js";
import type { ConversationPreview, ConversationsPage } from "./conversation.types.js";
import { toConversationPreview } from "./conversation.utils.js";

const BAD_REQUEST_STATUS = 400;
const NOT_FOUND_STATUS = 404;
const FORBIDDEN_STATUS = 403;

export const requireParticipant = async (conversationId: string, userId: string) => {
  const participant = await conversationRepository.findParticipant(conversationId, userId);
  if (!participant) {
    throw new AppError(
      "NOT_A_PARTICIPANT",
      "You don't have access to this conversation.",
      FORBIDDEN_STATUS,
    );
  }
  return participant;
};

export const conversationService = {
  async startDirectConversation(
    callerId: string,
    targetUserId: string,
  ): Promise<ConversationPreview> {
    if (callerId === targetUserId) {
      throw new AppError(
        "CANNOT_MESSAGE_SELF",
        "You can't start a conversation with yourself.",
        BAD_REQUEST_STATUS,
      );
    }

    const target = await userRepository.findById(targetUserId);
    if (!target) {
      throw new AppError("NOT_FOUND", "User not found.", NOT_FOUND_STATUS);
    }

    const available = await chatService.isChatAvailableBetween(callerId, targetUserId);
    if (!available) {
      throw new AppError(
        "CHAT_UNAVAILABLE",
        "You can't message this person right now.",
        FORBIDDEN_STATUS,
      );
    }

    const conversation = await conversationRepository.findOrCreateDirect(callerId, targetUserId);
    return toConversationPreview(conversation, callerId);
  },

  async getConversation(callerId: string, conversationId: string): Promise<ConversationPreview> {
    await requireParticipant(conversationId, callerId);
    const conversation = await conversationRepository.getById(conversationId);
    if (!conversation) {
      throw new AppError("NOT_FOUND", "Conversation not found.", NOT_FOUND_STATUS);
    }
    return toConversationPreview(conversation, callerId);
  },

  async listConversations(
    callerId: string,
    query: { cursor?: string; limit: number },
  ): Promise<ConversationsPage> {
    const rows = await conversationRepository.listForUser(callerId, query);
    const { items, nextCursor } = buildCursorPage(rows, query.limit, (row) => row.id);
    return { items: items.map((row) => toConversationPreview(row, callerId)), nextCursor };
  },
};
