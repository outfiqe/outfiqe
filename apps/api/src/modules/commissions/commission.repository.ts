import { prisma } from "#db/prisma.js";
import type { DbClient } from "#types/db.types.js";

import type { CommissionTierRecord, CreatePendingCommissionInput } from "./commission.types.js";

export const commissionRepository = {
  async findTierForPrice(price: number): Promise<CommissionTierRecord | null> {
    return prisma.commissionTier.findFirst({
      where: {
        minPrice: { lte: price },
        OR: [{ maxPrice: null }, { maxPrice: { gte: price } }],
      },
      orderBy: { minPrice: "desc" },
    });
  },

  async createPending(client: DbClient, input: CreatePendingCommissionInput): Promise<void> {
    await client.creatorCommission.create({ data: input });
  },
};
