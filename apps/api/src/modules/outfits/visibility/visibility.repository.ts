import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import { OutfitVisibility } from "#generated/prisma/enums.js";
import type { DbClient } from "#types/db.types.js";

import type { OutfitSummaryRow } from "../outfit.query-helpers.js";
import { activeBuildStatuses, summaryInclude } from "../outfit.query-helpers.js";

export const outfitShareRepository = {
  async addShares(
    tx: Prisma.TransactionClient,
    outfitId: string,
    userIds: string[],
    sharedById: string,
  ): Promise<void> {
    await tx.outfitShare.createMany({
      data: userIds.map((userId) => ({ outfitId, userId, sharedById })),
      skipDuplicates: true,
    });
  },

  async removeShare(
    tx: Prisma.TransactionClient,
    outfitId: string,
    userId: string,
  ): Promise<number> {
    const { count } = await tx.outfitShare.deleteMany({ where: { outfitId, userId } });
    return count;
  },

  async hasShare(client: DbClient, outfitId: string, userId: string): Promise<boolean> {
    const share = await client.outfitShare.findUnique({
      where: { outfitId_userId: { outfitId, userId } },
      select: { userId: true },
    });
    return share !== null;
  },

  async listSharedWith(
    userId: string,
    { cursor, limit }: { cursor?: string; limit: number },
  ): Promise<OutfitSummaryRow[]> {
    return prisma.outfit.findMany({
      where: {
        status: { in: activeBuildStatuses },
        visibility: { in: [OutfitVisibility.SHARED, OutfitVisibility.PUBLIC] },
        publishedVersion: { not: null },
        shares: { some: { userId } },
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: summaryInclude,
    });
  },
};
