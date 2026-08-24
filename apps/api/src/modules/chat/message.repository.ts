import { prisma } from "#db/prisma.js";

import { participantUserSelect } from "./conversation.utils.js";
import type { NewMessageAttachmentInput } from "./message.types.js";
import { messagePreviewFor } from "./message.utils.js";

const messageInclude = {
  sender: { select: participantUserSelect },
  attachments: {
    select: { id: true, url: true, mimeType: true, width: true, height: true },
  },
} as const;

export const messageRepository = {
  async send(
    conversationId: string,
    senderId: string,
    body: string | null,
    attachments: NewMessageAttachmentInput[],
  ) {
    return prisma.$transaction(async (tx) => {
      const message = await tx.message.create({
        data: {
          conversationId,
          senderId,
          body,
          attachments: { create: attachments },
        },
        include: messageInclude,
      });

      await tx.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: message.createdAt, lastMessagePreview: messagePreviewFor(body) },
      });

      await tx.conversationParticipant.updateMany({
        where: { conversationId, userId: { not: senderId } },
        data: { unreadCount: { increment: 1 } },
      });

      return message;
    });
  },

  async listForConversation(conversationId: string, params: { cursor?: string; limit: number }) {
    return prisma.message.findMany({
      where: { conversationId, deletedAt: null },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: params.limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      include: messageInclude,
    });
  },

  async findLatestId(conversationId: string): Promise<string | null> {
    const latest = await prisma.message.findFirst({
      where: { conversationId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    return latest?.id ?? null;
  },

  async markRead(
    conversationId: string,
    userId: string,
    lastReadMessageId: string | null,
    readAt: Date,
  ): Promise<void> {
    await prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { unreadCount: 0, lastReadAt: readAt, lastReadMessageId },
    });
  },

  async markDelivered(
    conversationId: string,
    userId: string,
    lastDeliveredMessageId: string,
    deliveredAt: Date,
  ): Promise<void> {
    await prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastDeliveredAt: deliveredAt, lastDeliveredMessageId },
    });
  },
};
