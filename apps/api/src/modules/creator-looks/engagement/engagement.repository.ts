import { prisma } from "#db/prisma.js";
import type { CreatorLookTagClickSource } from "#generated/prisma/enums.js";
import { TagReviewStatus } from "#generated/prisma/enums.js";

export const creatorLookEngagementRepository = {
  async like(lookId: string, userId: string): Promise<{ likeCount: number }> {
    return prisma.$transaction(async (tx) => {
      const { count } = await tx.creatorLookLike.createMany({
        data: [{ creatorLookId: lookId, userId }],
        skipDuplicates: true,
      });

      const look =
        count > 0
          ? await tx.creatorLook.update({
              where: { id: lookId },
              data: { likeCount: { increment: 1 } },
            })
          : await tx.creatorLook.findUniqueOrThrow({ where: { id: lookId } });

      return { likeCount: look.likeCount };
    });
  },

  async unlike(lookId: string, userId: string): Promise<{ likeCount: number; unliked: boolean }> {
    return prisma.$transaction(async (tx) => {
      const deleted = await tx.creatorLookLike.deleteMany({
        where: { creatorLookId: lookId, userId },
      });
      if (deleted.count === 0) {
        const look = await tx.creatorLook.findUniqueOrThrow({ where: { id: lookId } });
        return { likeCount: look.likeCount, unliked: false };
      }
      const look = await tx.creatorLook.update({
        where: { id: lookId },
        data: { likeCount: { decrement: 1 } },
      });
      return { likeCount: look.likeCount, unliked: true };
    });
  },

  async save(lookId: string, userId: string): Promise<{ saveCount: number }> {
    return prisma.$transaction(async (tx) => {
      const { count } = await tx.creatorLookSave.createMany({
        data: [{ creatorLookId: lookId, userId }],
        skipDuplicates: true,
      });

      const look =
        count > 0
          ? await tx.creatorLook.update({
              where: { id: lookId },
              data: { saveCount: { increment: 1 } },
            })
          : await tx.creatorLook.findUniqueOrThrow({ where: { id: lookId } });

      return { saveCount: look.saveCount };
    });
  },

  async unsave(lookId: string, userId: string): Promise<{ saveCount: number }> {
    return prisma.$transaction(async (tx) => {
      const deleted = await tx.creatorLookSave.deleteMany({
        where: { creatorLookId: lookId, userId },
      });
      if (deleted.count === 0) {
        const look = await tx.creatorLook.findUniqueOrThrow({ where: { id: lookId } });
        return { saveCount: look.saveCount };
      }
      const look = await tx.creatorLook.update({
        where: { id: lookId },
        data: { saveCount: { decrement: 1 } },
      });
      return { saveCount: look.saveCount };
    });
  },

  async tagExists(lookId: string, productId: string): Promise<boolean> {
    const tag = await prisma.creatorLookProduct.findFirst({
      where: {
        creatorLookId: lookId,
        productId,
        reviewStatus: TagReviewStatus.APPROVED,
      },
      select: { id: true },
    });
    return Boolean(tag);
  },

  async recordTagClick(input: {
    lookId: string;
    productId: string;
    userId?: string;
    sessionId: string;
    source: CreatorLookTagClickSource;
  }): Promise<void> {
    await prisma.creatorLookTagClick.create({
      data: {
        creatorLookId: input.lookId,
        productId: input.productId,
        userId: input.userId,
        sessionId: input.sessionId,
        source: input.source,
      },
    });
  },

  async recordView(input: {
    lookId: string;
    viewerId?: string;
    sessionId: string;
  }): Promise<{ counted: boolean; viewCount: number }> {
    return prisma.$transaction(async (tx) => {
      const { count } = await tx.creatorLookView.createMany({
        data: [
          {
            creatorLookId: input.lookId,
            viewerId: input.viewerId,
            sessionId: input.sessionId,
          },
        ],
        skipDuplicates: true,
      });

      const look =
        count > 0
          ? await tx.creatorLook.update({
              where: { id: input.lookId },
              data: { viewCount: { increment: 1 } },
            })
          : await tx.creatorLook.findUniqueOrThrow({ where: { id: input.lookId } });

      return { counted: count > 0, viewCount: look.viewCount };
    });
  },
};
