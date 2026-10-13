import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import { OutfitVisibility } from "#generated/prisma/enums.js";
import type { DbClient } from "#types/db.types.js";

import type { OutfitSummaryRow } from "../outfit.query-helpers.js";
import {
  activeBuildStatuses,
  outfitPersonSelect,
  summaryInclude,
} from "../outfit.query-helpers.js";

const LOOKAHEAD_ROW = 1;

export const outfitShareRepository = {
  async addShares(
    tx: Prisma.TransactionClient,
    outfitId: string,
    userIds: string[],
    sharedById: string,
  ): Promise<string[]> {
    const createdShares = await tx.outfitShare.createManyAndReturn({
      data: userIds.map((userId) => ({ outfitId, userId, sharedById })),
      skipDuplicates: true,
      select: { userId: true },
    });
    return createdShares.map(({ userId }) => userId);
  },

  async removeShare(
    tx: Prisma.TransactionClient,
    outfitId: string,
    userId: string,
  ): Promise<number> {
    const { count } = await tx.outfitShare.deleteMany({ where: { outfitId, userId } });
    return count;
  },

  async listRecipients(outfitId: string, { cursor, limit }: { cursor?: string; limit: number }) {
    return prisma.outfitShare.findMany({
      where: { outfitId },
      orderBy: [{ createdAt: "desc" }, { userId: "desc" }],
      take: limit + LOOKAHEAD_ROW,
      ...(cursor
        ? { cursor: { outfitId_userId: { outfitId, userId: cursor } }, skip: LOOKAHEAD_ROW }
        : {}),
      select: { userId: true, user: { select: outfitPersonSelect } },
    });
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
        removedAt: null,
        shares: { some: { userId } },
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: summaryInclude,
    });
  },
};
