import { prisma } from "#db/prisma.js";
import { type AccountStatus, BrandRole, ProductStatus } from "#generated/prisma/enums.js";
import { RESPONSIVE_IMAGE_ASSET_SELECT } from "#lib/responsive-image.utils.js";

import type {
  BrandProfile,
  BrandRecord,
  BrandWithImageAssets,
  BrandWithProductCount,
  UpdateBrandInput,
} from "./brand.types.js";

const withImageAssets = {
  bannerImageAsset: { select: RESPONSIVE_IMAGE_ASSET_SELECT },
  avatarImageAsset: { select: RESPONSIVE_IMAGE_ASSET_SELECT },
};

const withApprovedProductCount = {
  _count: { select: { products: { where: { status: ProductStatus.APPROVED } } } },
  ...withImageAssets,
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

  async findById(id: string): Promise<BrandWithImageAssets | null> {
    return prisma.brand.findUnique({ where: { id }, include: withImageAssets });
  },

  async findOwnerUserId(brandId: string): Promise<string | null> {
    const membership = await prisma.brandMembership.findFirst({
      where: { brandId, role: BrandRole.OWNER },
      select: { userId: true },
    });
    return membership?.userId ?? null;
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

  async listPublic(params: {
    cursor?: string;
    limit: number;
    q?: string;
  }): Promise<BrandWithProductCount[]> {
    const rows = await prisma.brand.findMany({
      where: params.q ? { name: { contains: params.q, mode: "insensitive" } } : undefined,
      include: withApprovedProductCount,
      orderBy: [{ followerCount: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      take: params.limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
    });
    return rows.map(({ _count, ...brand }) => ({ ...brand, productCount: _count.products }));
  },

  async countAll(q?: string): Promise<number> {
    return prisma.brand.count({
      where: q ? { name: { contains: q, mode: "insensitive" } } : undefined,
    });
  },

  async findAccountStatus(brandId: string): Promise<AccountStatus | null> {
    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
      select: { accountStatus: true },
    });
    return brand?.accountStatus ?? null;
  },
};
