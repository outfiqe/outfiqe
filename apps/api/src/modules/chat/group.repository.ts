import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import { ConversationMemberRole, ConversationType } from "#generated/prisma/enums.js";
import type { DbClient } from "#types/db.types.js";

import { participantUserSelect } from "./conversation.utils.js";
import type { LockedConversation } from "./group.types.js";
import type { ChatMemberReference } from "./message.schemas.js";

const memberWithUserInclude = { user: { select: participantUserSelect } } as const;

export const groupRepository = {
  async lockConversation(
    tx: Prisma.TransactionClient,
    conversationId: string,
  ): Promise<LockedConversation | null> {
    const [lockedConversation] = await tx.$queryRaw<LockedConversation[]>`
      SELECT "id", "type"::text AS "type" FROM "conversations" WHERE "id" = ${conversationId}::uuid FOR UPDATE`;
    return lockedConversation ?? null;
  },

  async create(
    tx: Prisma.TransactionClient,
    { name, createdById, memberIds }: { name: string; createdById: string; memberIds: string[] },
  ): Promise<{ id: string }> {
    return tx.conversation.create({
      data: {
        type: ConversationType.GROUP,
        name,
        createdById,
        participants: {
          create: [
            { userId: createdById, role: ConversationMemberRole.ADMIN },
            ...memberIds.map((userId) => ({ userId, role: ConversationMemberRole.MEMBER })),
          ],
        },
      },
      select: { id: true },
    });
  },

  async findConversationType(conversationId: string): Promise<ConversationType | null> {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { type: true },
    });
    return conversation?.type ?? null;
  },

  async rename(tx: Prisma.TransactionClient, conversationId: string, name: string): Promise<void> {
    await tx.conversation.update({ where: { id: conversationId }, data: { name } });
  },

  async findMember(client: DbClient, conversationId: string, userId: string) {
    return client.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
      include: memberWithUserInclude,
    });
  },

  async listMembers(client: DbClient, conversationId: string) {
    return client.conversationParticipant.findMany({
      where: { conversationId },
      orderBy: [{ role: "asc" }, { joinedAt: "asc" }, { userId: "asc" }],
      include: memberWithUserInclude,
    });
  },

  async listMemberIds(tx: Prisma.TransactionClient, conversationId: string): Promise<string[]> {
    const members = await tx.conversationParticipant.findMany({
      where: { conversationId },
      select: { userId: true },
    });
    return members.map(({ userId }) => userId);
  },

  async addMembers(
    tx: Prisma.TransactionClient,
    conversationId: string,
    userIds: string[],
  ): Promise<void> {
    await tx.conversationParticipant.createMany({
      data: userIds.map((userId) => ({ conversationId, userId })),
      skipDuplicates: true,
    });
  },

  async removeMember(
    tx: Prisma.TransactionClient,
    conversationId: string,
    userId: string,
  ): Promise<void> {
    await tx.conversationParticipant.delete({
      where: { conversationId_userId: { conversationId, userId } },
    });
  },

  async setRole(
    tx: Prisma.TransactionClient,
    conversationId: string,
    userId: string,
    role: ConversationMemberRole,
  ): Promise<void> {
    await tx.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { role },
    });
  },

  async countAdmins(tx: Prisma.TransactionClient, conversationId: string): Promise<number> {
    return tx.conversationParticipant.count({
      where: { conversationId, role: ConversationMemberRole.ADMIN },
    });
  },

  async findLongestStandingMemberId(
    tx: Prisma.TransactionClient,
    conversationId: string,
  ): Promise<string | null> {
    const member = await tx.conversationParticipant.findFirst({
      where: { conversationId },
      orderBy: [{ joinedAt: "asc" }, { userId: "asc" }],
      select: { userId: true },
    });
    return member?.userId ?? null;
  },

  async deleteConversation(tx: Prisma.TransactionClient, conversationId: string): Promise<void> {
    await tx.conversation.delete({ where: { id: conversationId } });
  },

  async findMemberReferences(userIds: string[]): Promise<ChatMemberReference[]> {
    if (userIds.length === 0) return [];
    return prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    });
  },
};
