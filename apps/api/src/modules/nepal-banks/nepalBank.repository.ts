import { prisma } from "#db/prisma.js";

import type { NepalBankRecord } from "./nepalBank.types.js";

export const nepalBankRepository = {
  async listActive(): Promise<NepalBankRecord[]> {
    return prisma.nepalBank.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
  },

  async findById(id: string): Promise<NepalBankRecord | null> {
    return prisma.nepalBank.findUnique({ where: { id } });
  },
};
