import { prisma } from "#db/prisma.js";
import { CreatorLinkStatus, CreatorLinkType } from "#generated/prisma/enums.js";

import type {
  CreateCreatorLinkInput,
  CreatorLinkRecord,
  CreatorLinkWithClickCount,
  CreatorLinkWithTarget,
} from "./creatorLink.types.js";

export const creatorLinkRepository = {
  async findActiveExternalLink(
    creatorId: string,
    productId: string | null,
  ): Promise<CreatorLinkRecord | null> {
    return prisma.creatorLink.findFirst({
      where: {
        creatorId,
        productId,
        type: CreatorLinkType.EXTERNAL_REUSABLE,
        status: CreatorLinkStatus.ACTIVE,
      },
    });
  },

  async create(input: CreateCreatorLinkInput): Promise<CreatorLinkRecord> {
    return prisma.creatorLink.create({ data: input });
  },

  async findByToken(token: string): Promise<CreatorLinkWithTarget | null> {
    return prisma.creatorLink.findUnique({
      where: { token },
      include: {
        creator: { select: { handle: true } },
        product: { select: { id: true } },
      },
    });
  },

  async consumeSingleUse(id: string): Promise<boolean> {
    const result = await prisma.creatorLink.updateMany({
      where: { id, status: CreatorLinkStatus.ACTIVE },
      data: { status: CreatorLinkStatus.CONSUMED, consumedAt: new Date() },
    });
    return result.count > 0;
  },

  async recordClick(input: { linkId: string; userId?: string; sessionId: string }): Promise<void> {
    await prisma.creatorLinkClick.create({ data: input });
  },

  async listForCreator(
    creatorId: string,
    params: { cursor?: string; limit: number },
  ): Promise<CreatorLinkWithClickCount[]> {
    return prisma.creatorLink.findMany({
      where: { creatorId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: params.limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      include: {
        product: { select: { name: true } },
        _count: { select: { clicks: true } },
      },
    });
  },

  async bridgeSessionClicks(sessionId: string, userId: string): Promise<number> {
    const result = await prisma.creatorLinkClick.updateMany({
      where: { sessionId, userId: null },
      data: { userId },
    });
    return result.count;
  },
};
