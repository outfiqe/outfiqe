import { prisma } from "#db/prisma.js";
import { ConversationType } from "#generated/prisma/enums.js";
import { isUniqueConstraintError } from "#lib/prisma.utils.js";

import { buildDirectKey, participantUserSelect } from "./conversation.utils.js";

const participantsInclude = {
  participants: { include: { user: { select: participantUserSelect } } },
} as const;

export const conversationRepository = {
  async findOrCreateDirect(userAId: string, userBId: string) {
    const directKey = buildDirectKey(userAId, userBId);

    try {
      return await prisma.conversation.create({
        data: {
          type: ConversationType.DIRECT,
          directKey,
          participants: { create: [{ userId: userAId }, { userId: userBId }] },
        },
        include: participantsInclude,
      });
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
      const existing = await prisma.conversation.findUnique({
        where: { directKey },
        include: participantsInclude,
      });
      if (existing) return existing;
      throw error;
    }
  },

  async getById(conversationId: string) {
    return prisma.conversation.findUnique({
      where: { id: conversationId },
      include: participantsInclude,
    });
  },

  async findParticipant(conversationId: string, userId: string) {
    return prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
  },

  async findOtherParticipant(conversationId: string, userId: string) {
    return prisma.conversationParticipant.findFirst({
      where: { conversationId, userId: { not: userId } },
    });
  },

  async listForUser(userId: string, params: { cursor?: string; limit: number }) {
    return prisma.conversation.findMany({
      where: { participants: { some: { userId } }, lastMessageAt: { not: null } },
      orderBy: [{ lastMessageAt: "desc" }, { id: "desc" }],
      take: params.limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      include: participantsInclude,
    });
  },
};
