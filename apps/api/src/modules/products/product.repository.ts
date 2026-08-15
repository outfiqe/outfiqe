import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import type { ProductType } from "#generated/prisma/enums.js";
import { CreatorStatus, ProductStatus } from "#generated/prisma/enums.js";
import type { DbClient } from "#types/db.types.js";

import { NEW_ARRIVAL_WINDOW_MS } from "./product.constants.js";
import type {
  CreateProductInput,
  ProductRecord,
  ProductSizeRecord,
  ProductWithStock,
  SeenOnCreator,
  UpdateProductInput,
} from "./product.types.js";
import { sumStock } from "./product.utils.js";

export type { DbClient } from "#types/db.types.js";

const TRENDING_LIMIT = 5;
const NEW_ARRIVALS_LIMIT = 10;
const SEEN_ON_CREATORS_LIMIT = 5;

const withBrandAndCategories = {
  brand: { select: { name: true } },
  categories: { select: { slug: true, name: true } },
  sizes: { select: { stock: true } },
};

type PublicFilter = { categoryId?: string; type?: ProductType; brandId?: string; q?: string };

const withTotalStock = <T extends { sizes: { stock: number }[] }>(
  rows: T[],
): (Omit<T, "sizes"> & { totalStock: number })[] =>
  rows.map(({ sizes, ...rest }) => ({ ...rest, totalStock: sumStock(sizes) }));

export const productRepository = {
  async create(input: CreateProductInput): Promise<ProductWithStock> {
    const { imageUrls, categoryIds, ...rest } = input;
    const { sizes, ...product } = await prisma.product.create({
      data: {
        ...rest,
        categories: { connect: categoryIds.map((id) => ({ id })) },
        imageUrl: imageUrls?.[0],
        images: imageUrls?.length
          ? { create: imageUrls.map((url, sortOrder) => ({ url, sortOrder })) }
          : undefined,
      },
      include: withBrandAndCategories,
    });
    return { ...product, totalStock: sumStock(sizes) };
  },

  async update(id: string, input: UpdateProductInput): Promise<ProductRecord> {
    const { imageUrls, categoryIds, ...rest } = input;
    return prisma.product.update({
      where: { id },
      data: {
        ...rest,
        ...(categoryIds ? { categories: { set: categoryIds.map((id) => ({ id })) } } : {}),
        ...(imageUrls
          ? {
              imageUrl: imageUrls[0],
              images: {
                deleteMany: {},
                create: imageUrls.map((url, sortOrder) => ({ url, sortOrder })),
              },
            }
          : {}),
      },
    });
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

  async listByBrandId(
    brandId: string,
    params: { cursor?: string; limit: number },
  ): Promise<ProductWithStock[]> {
    const rows = await prisma.product.findMany({
      where: { brandId },
      include: withBrandAndCategories,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: params.limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
    });
    return withTotalStock(rows);
  },

  async listForReview(
    status: ProductStatus,
    params: { cursor?: string; limit: number },
  ): Promise<ProductWithStock[]> {
    const rows = await prisma.product.findMany({
      where: { status },
      include: withBrandAndCategories,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: params.limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
    });
    return withTotalStock(rows);
  },

  async listPublic(
    filter: PublicFilter & { cursor?: string; limit: number },
  ): Promise<ProductWithStock[]> {
    const rows = await prisma.product.findMany({
      where: {
        status: ProductStatus.APPROVED,
        categories: filter.categoryId ? { some: { id: filter.categoryId } } : undefined,
        type: filter.type,
        brandId: filter.brandId,
        name: filter.q ? { contains: filter.q, mode: "insensitive" } : undefined,
      },
      include: withBrandAndCategories,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: filter.limit + 1,
      ...(filter.cursor ? { cursor: { id: filter.cursor }, skip: 1 } : {}),
    });
    return withTotalStock(rows);
  },

  async countPublic(filter: PublicFilter): Promise<{ total: number; brandCount: number }> {
    const where: Prisma.ProductWhereInput = {
      status: ProductStatus.APPROVED,
      categories: filter.categoryId ? { some: { id: filter.categoryId } } : undefined,
      type: filter.type,
      brandId: filter.brandId,
      name: filter.q ? { contains: filter.q, mode: "insensitive" } : undefined,
    };

    const [total, grouped] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.groupBy({ by: ["brandId"], where }),
    ]);

    return { total, brandCount: grouped.length };
  },

  async listTrending(): Promise<ProductWithStock[]> {
    const rows = await prisma.product.findMany({
      where: { status: ProductStatus.APPROVED },
      include: withBrandAndCategories,
      orderBy: { reviewedAt: "desc" },
      take: TRENDING_LIMIT,
    });
    return withTotalStock(rows);
  },

  async listNewArrivals(): Promise<ProductWithStock[]> {
    const rows = await prisma.product.findMany({
      where: {
        status: ProductStatus.APPROVED,
        createdAt: { gte: new Date(Date.now() - NEW_ARRIVAL_WINDOW_MS) },
      },
      include: withBrandAndCategories,
      orderBy: { createdAt: "desc" },
      take: NEW_ARRIVALS_LIMIT,
    });
    return withTotalStock(rows);
  },

  async findPublicById(id: string): Promise<
    | (ProductWithStock & {
        brandId: string;
        sizes: ProductSizeRecord[];
        images: { url: string }[];
      })
    | null
  > {
    const product = await prisma.product.findFirst({
      where: { id, status: ProductStatus.APPROVED },
      include: {
        brand: { select: { name: true } },
        categories: { select: { slug: true, name: true } },
        sizes: { orderBy: { sortOrder: "asc" }, select: { id: true, label: true, stock: true } },
        images: { orderBy: { sortOrder: "asc" }, select: { url: true } },
      },
    });
    if (!product) return null;

    const { sizes, ...rest } = product;
    return {
      ...rest,
      totalStock: sumStock(sizes),
      sizes: sizes.map(({ id, label, stock }) => ({ id, label, inStock: stock > 0 })),
    };
  },

  async decrementStock(client: DbClient, sizeId: string, qty: number): Promise<boolean> {
    const result = await client.productSize.updateMany({
      where: { id: sizeId, stock: { gte: qty } },
      data: { stock: { decrement: qty } },
    });
    return result.count > 0;
  },

  async restoreStock(client: DbClient, sizeId: string, qty: number): Promise<void> {
    await client.productSize.update({
      where: { id: sizeId },
      data: { stock: { increment: qty } },
    });
  },

  async getStockBySizeIds(sizeIds: string[]): Promise<Map<string, number>> {
    const sizes = await prisma.productSize.findMany({
      where: { id: { in: sizeIds } },
      select: { id: true, stock: true },
    });
    return new Map(sizes.map((size) => [size.id, size.stock]));
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
