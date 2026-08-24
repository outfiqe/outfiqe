import { UserRole } from "#generated/prisma/enums.js";
import { buildCursorPage } from "#lib/pagination.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { userRepository } from "#modules/users/user.repository.js";

import { CHAT_CONTACT_SEARCH_RESULT_LIMIT } from "./chat.constants.js";
import { chatRepository } from "./chat.repository.js";
import type { ChatBlocksPage, ChatContact, ChatSettingsView } from "./chat.types.js";
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
    if (!existing) await chatRepository.createBlock(userId, targetId);
  },

  async unblockUser(userId: string, targetId: string): Promise<void> {
    await chatRepository.deleteBlock(userId, targetId);
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

  async isChatAvailableBetween(userAId: string, userBId: string): Promise<boolean> {
    if (userAId === userBId) return true;

    const [userA, userB, block] = await Promise.all([
      userRepository.findById(userAId),
      userRepository.findById(userBId),
      chatRepository.findBlockBetween(userAId, userBId),
    ]);
    if (!userA || !userB) return false;
    if (userA.role === UserRole.ADMIN || userB.role === UserRole.ADMIN) return true;
    if (block) return false;

    const [settingsA, settingsB] = await Promise.all([
      chatRepository.getSettings(userAId),
      chatRepository.getSettings(userBId),
    ]);
    return (settingsA?.isChatEnabled ?? true) && (settingsB?.isChatEnabled ?? true);
  },
};
