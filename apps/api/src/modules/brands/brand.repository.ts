import { prisma } from "#db/prisma.js";
import { ProductStatus } from "#generated/prisma/enums.js";

import type { BrandProfile, BrandRecord, UpdateBrandInput } from "./brand.types.js";

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

  async update(id: string, updates: UpdateBrandInput): Promise<BrandRecord> {
    return prisma.brand.update({ where: { id }, data: updates });
  },

  async countApprovedProducts(brandId: string): Promise<number> {
    return prisma.product.count({ where: { brandId, status: ProductStatus.APPROVED } });
  },
};
