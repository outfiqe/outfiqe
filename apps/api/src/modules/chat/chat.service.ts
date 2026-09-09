import { DomainEvents, eventBus } from "#events/event-bus.js";
import { UserRole } from "#generated/prisma/enums.js";
import { buildCursorPage } from "#lib/pagination.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { userRepository } from "#modules/users/user.repository.js";

import { CHAT_CONTACT_SEARCH_RESULT_LIMIT } from "./chat.constants.js";
import { chatRepository } from "./chat.repository.js";
import {
  type ChatAvailability,
  type ChatBlocksPage,
  type ChatContact,
  type ChatSettingsView,
  ChatUnavailableReason,
} from "./chat.types.js";
import { toBlockedChatContact } from "./chat.utils.js";

const BAD_REQUEST_STATUS = 400;
const NOT_FOUND_STATUS = 404;
const FORBIDDEN_STATUS = 403;

const requireBlockableTarget = async (targetId: string) => {
  const target = await userRepository.findById(targetId);
  if (!target) {
    throw new AppError("NOT_FOUND", "User not found.", NOT_FOUND_STATUS);
  }
  if (target.role === UserRole.ADMIN) {
    throw new AppError(
      "CANNOT_BLOCK_ADMIN",
      "Chat with Admin/Support accounts can't be turned off.",
      BAD_REQUEST_STATUS,
    );
  }
  return target;
};

const computeChatAvailability = async (
  callerId: string,
  recipientId: string,
): Promise<ChatAvailability> => {
  if (callerId === recipientId) return { isAvailable: true };

  const [caller, recipient, block] = await Promise.all([
    userRepository.findById(callerId),
    userRepository.findById(recipientId),
    chatRepository.findBlockBetween(callerId, recipientId),
  ]);
  if (!caller || !recipient) {
    return { isAvailable: false, reason: ChatUnavailableReason.RECIPIENT_UNREACHABLE };
  }
  if (caller.role === UserRole.ADMIN || recipient.role === UserRole.ADMIN) {
    return { isAvailable: true };
  }

  if (block) {
    return {
      isAvailable: false,
      reason:
        block.blockerId === callerId
          ? ChatUnavailableReason.YOU_TURNED_OFF_THIS_PERSON
          : ChatUnavailableReason.RECIPIENT_UNREACHABLE,
    };
  }

  const [callerSettings, recipientSettings] = await Promise.all([
    chatRepository.getSettings(callerId),
    chatRepository.getSettings(recipientId),
  ]);
  if (!(callerSettings?.isChatEnabled ?? true)) {
    return { isAvailable: false, reason: ChatUnavailableReason.YOUR_CHAT_DISABLED };
  }
  if (!(recipientSettings?.isChatEnabled ?? true)) {
    return { isAvailable: false, reason: ChatUnavailableReason.RECIPIENT_UNREACHABLE };
  }
  return { isAvailable: true };
};

export const chatService = {
  async getSettings(userId: string, role: UserRole): Promise<ChatSettingsView> {
    if (role === UserRole.ADMIN) return { isChatEnabled: true };

    const settings = await chatRepository.getSettings(userId);
    return { isChatEnabled: settings?.isChatEnabled ?? true };
  },

  async setGlobalChatEnabled(
    userId: string,
    role: UserRole,
    isChatEnabled: boolean,
  ): Promise<ChatSettingsView> {
    if (role === UserRole.ADMIN && !isChatEnabled) {
      throw new AppError(
        "ADMIN_CHAT_ALWAYS_ON",
        "Admin accounts must stay reachable for support and can't turn off chat.",
        FORBIDDEN_STATUS,
      );
    }

    const settings = await chatRepository.upsertSettings(userId, isChatEnabled);
    await eventBus.publish(DomainEvents.CHAT_SETTINGS_UPDATED, {
      userId,
      isChatEnabled: settings.isChatEnabled,
    });
    return { isChatEnabled: settings.isChatEnabled };
  },

  async blockUser(userId: string, targetId: string): Promise<void> {
    if (userId === targetId) {
      throw new AppError(
        "CANNOT_BLOCK_SELF",
        "You can't turn off chat with yourself.",
        BAD_REQUEST_STATUS,
      );
    }

    await requireBlockableTarget(targetId);

    const existing = await chatRepository.findBlockBetween(userId, targetId);
    if (!existing) {
      await chatRepository.createBlock(userId, targetId);
      await eventBus.publish(DomainEvents.CHAT_BLOCK_LIST_UPDATED, { userId });
    }
  },

  async unblockUser(userId: string, targetId: string): Promise<void> {
    const wasDeleted = await chatRepository.deleteBlock(userId, targetId);
    if (wasDeleted) {
      await eventBus.publish(DomainEvents.CHAT_BLOCK_LIST_UPDATED, { userId });
    }
  },

  async listBlockedUsers(
    userId: string,
    query: { cursor?: string; limit: number },
  ): Promise<ChatBlocksPage> {
    const rows = await chatRepository.listBlockedByUser(userId, query);
    const { items, nextCursor } = buildCursorPage(rows, query.limit, (row) => row.blockedId);
    return { items: items.map(toBlockedChatContact), nextCursor };
  },

  async searchContacts(userId: string, query: string): Promise<ChatContact[]> {
    return chatRepository.searchContacts(userId, query, CHAT_CONTACT_SEARCH_RESULT_LIMIT);
  },

  resolveChatAvailability: computeChatAvailability,

  async isChatAvailableBetween(userAId: string, userBId: string): Promise<boolean> {
    return (await computeChatAvailability(userAId, userBId)).isAvailable;
  },
};
