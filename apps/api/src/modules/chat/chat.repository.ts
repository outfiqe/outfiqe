import { prisma } from "#db/prisma.js";
import { UserRole } from "#generated/prisma/enums.js";

import type { ChatContact } from "./chat.types.js";

type BlockedChatContactRow = {
  blockedId: string;
  createdAt: Date;
  blocked: ChatContact;
};

export const chatRepository = {
  async getSettings(userId: string) {
    return prisma.chatSettings.findUnique({ where: { userId } });
  },

  async upsertSettings(userId: string, isChatEnabled: boolean) {
    return prisma.chatSettings.upsert({
      where: { userId },
      create: { userId, isChatEnabled },
      update: { isChatEnabled },
    });
  },

  async findBlockBetween(userAId: string, userBId: string) {
    return prisma.chatBlock.findFirst({
      where: {
        OR: [
          { blockerId: userAId, blockedId: userBId },
          { blockerId: userBId, blockedId: userAId },
        ],
      },
    });
  },

  async createBlock(blockerId: string, blockedId: string) {
    return prisma.chatBlock.create({ data: { blockerId, blockedId } });
  },

  async deleteBlock(blockerId: string, blockedId: string): Promise<boolean> {
    const { count } = await prisma.chatBlock.deleteMany({ where: { blockerId, blockedId } });
    return count > 0;
  },

  async listBlockedByUser(
    blockerId: string,
    params: { cursor?: string; limit: number },
  ): Promise<BlockedChatContactRow[]> {
    return prisma.chatBlock.findMany({
      where: { blockerId },
      orderBy: [{ createdAt: "desc" }, { blockedId: "desc" }],
      take: params.limit + 1,
      ...(params.cursor
        ? { cursor: { blockerId_blockedId: { blockerId, blockedId: params.cursor } }, skip: 1 }
        : {}),
      select: {
        blockedId: true,
        createdAt: true,
        blocked: { select: { id: true, name: true, handle: true, avatarUrl: true } },
      },
    });
  },

  async searchContacts(callerId: string, query: string, limit: number): Promise<ChatContact[]> {
    return prisma.user.findMany({
      where: {
        id: { not: callerId },
        role: { not: UserRole.ADMIN },
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { handle: { contains: query, mode: "insensitive" } },
        ],
      },
      orderBy: { name: "asc" },
      take: limit,
      select: { id: true, name: true, handle: true, avatarUrl: true },
    });
  },
};
