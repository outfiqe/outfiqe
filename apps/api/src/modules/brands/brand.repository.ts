import { prisma } from "../../shared/db/prisma.js";

import type { BrandProfile, BrandRecord } from "./brand.types.js";

export const brandRepository = {
  async findByMemberUserId(userId: string): Promise<BrandProfile | null> {
    const membership = await prisma.brandMembership.findFirst({
      where: { userId },
      include: { brand: true },
    });

    if (!membership) return null;

    return { brand: membership.brand, membershipRole: membership.role };
  },

  async findById(id: string): Promise<BrandRecord | null> {
    return prisma.brand.findUnique({ where: { id } });
  },
};
