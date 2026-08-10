import { prisma } from "../../shared/db/prisma.js";

import { CreatorStatus, ProductStatus } from "../../generated/prisma/enums.js";
import type { ProductType, TasteCategory } from "../../generated/prisma/enums.js";
import type {
  CreateProductInput,
  ProductRecord,
  ProductSizeRecord,
  ProductWithBrand,
  SeenOnCreator,
  UpdateProductInput,
} from "./product.types.js";

const TRENDING_LIMIT = 5;
const NEW_ARRIVALS_LIMIT = 10;
const NEW_ARRIVAL_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const SEEN_ON_CREATORS_LIMIT = 5;

const withBrandName = { brand: { select: { name: true } } };

type PublicFilter = { category?: TasteCategory; type?: ProductType; brandId?: string; q?: string };

export const productRepository = {
  async create(input: CreateProductInput): Promise<ProductRecord> {
    return prisma.product.create({ data: input });
  },

  async update(id: string, input: UpdateProductInput): Promise<ProductRecord> {
    return prisma.product.update({ where: { id }, data: input });
  },

  async approve(id: string, reviewedById: string): Promise<ProductRecord> {
    return prisma.product.update({
      where: { id },
      data: { status: ProductStatus.APPROVED, reviewedAt: new Date(), reviewedById },
    });
  },

  async reject(id: string, reviewedById: string): Promise<ProductRecord> {
    return prisma.product.update({
      where: { id },
      data: { status: ProductStatus.REJECTED, reviewedAt: new Date(), reviewedById },
    });
  },

  async findById(id: string): Promise<ProductRecord | null> {
    return prisma.product.findUnique({ where: { id } });
  },

  async findApprovedByIds(ids: string[]): Promise<ProductRecord[]> {
    return prisma.product.findMany({
      where: { id: { in: ids }, status: ProductStatus.APPROVED },
    });
  },

  async listByBrandId(brandId: string): Promise<ProductRecord[]> {
    return prisma.product.findMany({ where: { brandId }, orderBy: { createdAt: "desc" } });
  },

  async listForReview(status: ProductStatus): Promise<ProductWithBrand[]> {
    return prisma.product.findMany({
      where: { status },
      include: withBrandName,
      orderBy: { createdAt: "desc" },
    });
  },

  async listPublic(
    filter: PublicFilter & { cursor?: string; limit: number },
  ): Promise<ProductWithBrand[]> {
    return prisma.product.findMany({
      where: {
        status: ProductStatus.APPROVED,
        category: filter.category,
        type: filter.type,
        brandId: filter.brandId,
        name: filter.q ? { contains: filter.q, mode: "insensitive" } : undefined,
      },
      include: withBrandName,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: filter.limit + 1,
      ...(filter.cursor ? { cursor: { id: filter.cursor }, skip: 1 } : {}),
    });
  },

  async countPublic(filter: PublicFilter): Promise<{ total: number; brandCount: number }> {
    const grouped = await prisma.product.groupBy({
      by: ["brandId"],
      where: {
        status: ProductStatus.APPROVED,
        category: filter.category,
        type: filter.type,
        brandId: filter.brandId,
        name: filter.q ? { contains: filter.q, mode: "insensitive" } : undefined,
      },
      _count: { _all: true },
    });

    return {
      total: grouped.reduce((sum, group) => sum + group._count._all, 0),
      brandCount: grouped.length,
    };
  },

  async listTrending(): Promise<ProductWithBrand[]> {
    return prisma.product.findMany({
      where: { status: ProductStatus.APPROVED },
      include: withBrandName,
      orderBy: { reviewedAt: "desc" },
      take: TRENDING_LIMIT,
    });
  },

  async listNewArrivals(): Promise<ProductWithBrand[]> {
    return prisma.product.findMany({
      where: {
        status: ProductStatus.APPROVED,
        createdAt: { gte: new Date(Date.now() - NEW_ARRIVAL_WINDOW_MS) },
      },
      include: withBrandName,
      orderBy: { createdAt: "desc" },
      take: NEW_ARRIVALS_LIMIT,
    });
  },

  async findPublicById(
    id: string,
  ): Promise<(ProductWithBrand & { brandId: string; sizes: ProductSizeRecord[] }) | null> {
    return prisma.product.findFirst({
      where: { id, status: ProductStatus.APPROVED },
      include: {
        brand: { select: { name: true } },
        sizes: { orderBy: { sortOrder: "asc" }, select: { label: true, inStock: true } },
      },
    });
  },

  async countDistinctApprovedCreators(productId: string): Promise<number> {
    const creators = await prisma.creatorLook.findMany({
      where: {
        deletedAt: null,
        creator: { creatorStatus: CreatorStatus.APPROVED },
        taggedProducts: { some: { productId } },
      },
      select: { creatorId: true },
      distinct: ["creatorId"],
    });
    return creators.length;
  },

  async listSeenOnCreators(productId: string): Promise<SeenOnCreator[]> {
    const rows = await prisma.creatorLookProduct.findMany({
      where: {
        productId,
        creatorLook: { deletedAt: null, creator: { creatorStatus: CreatorStatus.APPROVED } },
      },
      select: {
        sizeWorn: true,
        creatorLook: {
          select: {
            id: true,
            imageUrl: true,
            creator: { select: { id: true, name: true, handle: true, heightCm: true } },
          },
        },
      },
      orderBy: { creatorLook: { createdAt: "desc" } },
    });

    const byCreator = new Map<string, SeenOnCreator>();
    for (const row of rows) {
      const { creator } = row.creatorLook;
      if (byCreator.has(creator.id)) continue;
      byCreator.set(creator.id, {
        creatorId: creator.id,
        name: creator.name,
        handle: creator.handle,
        heightCm: creator.heightCm,
        sizeWorn: row.sizeWorn,
        lookId: row.creatorLook.id,
        lookImageUrl: row.creatorLook.imageUrl,
      });
      if (byCreator.size >= SEEN_ON_CREATORS_LIMIT) break;
    }
    return [...byCreator.values()];
  },

  async updateWornByCount(productId: string, wornByCount: number): Promise<void> {
    await prisma.product.update({ where: { id: productId }, data: { wornByCount } });
  },

  async listProductIdsTaggedByCreator(creatorId: string): Promise<string[]> {
    const rows = await prisma.creatorLookProduct.findMany({
      where: { creatorLook: { creatorId } },
      select: { productId: true },
      distinct: ["productId"],
    });
    return rows.map((row) => row.productId);
  },
};
