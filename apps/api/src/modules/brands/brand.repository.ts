import { prisma } from "#db/prisma.js";
import { ProductStatus } from "#generated/prisma/enums.js";

import type {
  BrandProfile,
  BrandRecord,
  BrandWithProductCount,
  UpdateBrandInput,
} from "./brand.types.js";

const withApprovedProductCount = {
  _count: { select: { products: { where: { status: ProductStatus.APPROVED } } } },
};

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

  async findManyByIds(ids: string[], q?: string): Promise<BrandRecord[]> {
    if (ids.length === 0) return [];
    return prisma.brand.findMany({
      where: { id: { in: ids }, ...(q ? { name: { contains: q, mode: "insensitive" } } : {}) },
    });
  },

  async update(id: string, updates: UpdateBrandInput): Promise<BrandRecord> {
    return prisma.brand.update({ where: { id }, data: updates });
  },

  async countApprovedProducts(brandId: string): Promise<number> {
    return prisma.product.count({ where: { brandId, status: ProductStatus.APPROVED } });
  },

  async listPublic(params: { cursor?: string; limit: number }): Promise<BrandWithProductCount[]> {
    const rows = await prisma.brand.findMany({
      include: withApprovedProductCount,
      orderBy: [{ followerCount: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      take: params.limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
    });
    return rows.map(({ _count, ...brand }) => ({ ...brand, productCount: _count.products }));
  },

  async countAll(): Promise<number> {
    return prisma.brand.count();
  },
};
