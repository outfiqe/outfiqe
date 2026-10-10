import { HTTP_STATUS } from "#constants/http.constants.js";
import { buildCursorPage } from "#lib/pagination.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { userRepository } from "#modules/users/user.repository.js";
import { isUserOnline } from "#socket/socket.presence.js";

import { chatService } from "../chat.service.js";
import { chatUnavailableError } from "../chat.utils.js";
import { conversationRepository } from "./conversation.repository.js";
import type {
  ConversationParticipantPresence,
  ConversationPreview,
  ConversationsPage,
} from "./conversation.types.js";
import { otherParticipantIdOf, toConversationPreview } from "./conversation.utils.js";

export const requireParticipant = async (conversationId: string, userId: string) => {
  const participant = await conversationRepository.findParticipant(conversationId, userId);
  if (!participant) {
    throw new AppError(
      "NOT_A_PARTICIPANT",
      "You don't have access to this conversation.",
      HTTP_STATUS.FORBIDDEN,
    );
  }
  return participant;
};

const buildPresenceMap = async (
  userIds: string[],
): Promise<Map<string, ConversationParticipantPresence>> => {
  const uniqueIds = [...new Set(userIds)];
  if (uniqueIds.length === 0) return new Map();

  const [onlineFlags, lastSeenByUserId] = await Promise.all([
    Promise.all(uniqueIds.map((userId) => isUserOnline(userId))),
    userRepository.findLastSeenAtByIds(uniqueIds),
  ]);

  return new Map(
    uniqueIds.map((userId, index) => [
      userId,
      {
        isOnline: onlineFlags[index] ?? false,
        lastSeenAt: lastSeenByUserId.get(userId)?.toISOString() ?? null,
      },
    ]),
  );
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
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const target = await userRepository.findById(targetUserId);
    if (!target) {
      throw new AppError("NOT_FOUND", "User not found.", HTTP_STATUS.NOT_FOUND);
    }

    const availability = await chatService.resolveChatAvailability(callerId, targetUserId);
    if (!availability.isAvailable) {
      throw chatUnavailableError(availability.reason);
    }

    const conversation = await conversationRepository.findOrCreateDirect(callerId, targetUserId);
    const presenceByUserId = await buildPresenceMap([targetUserId]);
    return toConversationPreview(conversation, callerId, presenceByUserId);
  },

  async getConversation(callerId: string, conversationId: string): Promise<ConversationPreview> {
    await requireParticipant(conversationId, callerId);
    const conversation = await conversationRepository.getById(conversationId);
    if (!conversation) {
      throw new AppError("NOT_FOUND", "Conversation not found.", HTTP_STATUS.NOT_FOUND);
    }

    const otherParticipantId = otherParticipantIdOf(conversation, callerId);
    const presenceByUserId = await buildPresenceMap(otherParticipantId ? [otherParticipantId] : []);
    return toConversationPreview(conversation, callerId, presenceByUserId);
  },

  async listConversations(
    callerId: string,
    query: { cursor?: string; limit: number; q?: string },
  ): Promise<ConversationsPage> {
    const rows = await conversationRepository.listForUser(callerId, query);
    const { items, nextCursor } = buildCursorPage(rows, query.limit, (row) => row.id);

    const otherParticipantIds = items
      .map((row) => otherParticipantIdOf(row, callerId))
      .filter((userId): userId is string => userId !== null);
    const presenceByUserId = await buildPresenceMap(otherParticipantIds);

    return {
      items: items.map((row) => toConversationPreview(row, callerId, presenceByUserId)),
      nextCursor,
    };
  },
};
