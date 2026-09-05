import { PRODUCT_SORT, type ProductSort } from "@outfiqe/utils";

import { prisma } from "#db/prisma.js";
import { Prisma } from "#generated/prisma/client.js";
import { CreatorStatus, ProductStatus } from "#generated/prisma/enums.js";
import type { DbClient } from "#types/db.types.js";

import {
  NEW_ARRIVAL_WINDOW_MS,
  PRODUCT_RATING_MAX,
  PRODUCT_RATING_MIN,
  TRENDING_LIMIT,
} from "./product.constants.js";
import type {
  BrandProductSize,
  CreateProductInput,
  ProductDiscountRecord,
  ProductRecord,
  ProductSalesStats,
  ProductSearchParams,
  ProductSearchResult,
  ProductSizeRecord,
  ProductWithStock,
  ProductWithStockSizesAndImages,
  SeenOnCreator,
  SetProductDiscountInput,
  UpdateProductDiscountInput,
  UpdateProductInput,
} from "./product.types.js";
import { sumStock } from "./product.utils.js";

export type { DbClient } from "#types/db.types.js";

const NEW_ARRIVALS_LIMIT = 10;
const SEEN_ON_CREATORS_LIMIT = 5;

const withActiveDiscount = () => {
  const now = new Date();
  return {
    discounts: {
      where: {
        isActive: true,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gte: now } }],
      },
      orderBy: { createdAt: "desc" as const },
      take: 1,
    },
  };
};

const withBrandAndCategories = {
  brand: { select: { name: true } },
  categories: { select: { slug: true, name: true } },
  productType: { select: { slug: true, label: true } },
  sizes: { select: { id: true, label: true, stock: true }, orderBy: { sortOrder: "asc" as const } },
};

const withImages = {
  images: { orderBy: { sortOrder: "asc" as const }, select: { url: true } },
};

type PublicFilter = {
  categoryId?: string;
  productTypeId?: string;
  brandId?: string;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  sort?: ProductSort;
};

const buildPublicWhere = (filter: PublicFilter): Prisma.ProductWhereInput => ({
  status: ProductStatus.APPROVED,
  deletedAt: null,
  categories: filter.categoryId ? { some: { id: filter.categoryId } } : undefined,
  productTypeId: filter.productTypeId,
  brandId: filter.brandId,
  price:
    filter.minPrice !== undefined || filter.maxPrice !== undefined
      ? { gte: filter.minPrice, lte: filter.maxPrice }
      : undefined,
  sizes: filter.inStockOnly ? { some: { stock: { gt: 0 } } } : undefined,
  createdAt:
    filter.sort === PRODUCT_SORT.NEW_ARRIVALS
      ? { gte: new Date(Date.now() - NEW_ARRIVAL_WINDOW_MS) }
      : undefined,
});

const withTotalStock = <T extends { sizes: { stock: number }[] }>(
  rows: T[],
): (Omit<T, "sizes"> & { totalStock: number })[] =>
  rows.map(({ sizes, ...rest }) => ({ ...rest, totalStock: sumStock(sizes) }));

const EMPTY_SALES_STATS: ProductSalesStats = { creatorBuyerCount: 0, unitsSold: 0 };

type RatingCountField =
  "rating1Count" | "rating2Count" | "rating3Count" | "rating4Count" | "rating5Count";

const RATING_COUNT_FIELD_BY_VALUE: Record<number, RatingCountField> = {
  1: "rating1Count",
  2: "rating2Count",
  3: "rating3Count",
  4: "rating4Count",
  5: "rating5Count",
};

const getSalesStatsByProductIds = async (
  productIds: string[],
): Promise<Map<string, ProductSalesStats>> => {
  if (productIds.length === 0) return new Map();

  const rows = await prisma.$queryRaw<
    { product_id: string; creator_buyer_count: bigint; units_sold: bigint }[]
  >(Prisma.sql`
    SELECT
      oi.product_id,
      COUNT(DISTINCT CASE WHEN u.is_creator AND u.creator_status = 'APPROVED' THEN o.user_id END)
        AS creator_buyer_count,
      SUM(oi.qty) AS units_sold
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    JOIN users u ON u.id = o.user_id
    WHERE oi.product_id IN (${Prisma.join(productIds)})
      AND o.fulfilment_status != 'CANCELLED'
      AND o.payment_status IN ('PAID', 'DUE')
    GROUP BY oi.product_id
  `);

  return new Map(
    rows.map((row) => [
      row.product_id,
      { creatorBuyerCount: Number(row.creator_buyer_count), unitsSold: Number(row.units_sold) },
    ]),
  );
};

const withSalesStats = async <T extends { id: string }>(
  rows: T[],
): Promise<(T & ProductSalesStats)[]> => {
  const stats = await getSalesStatsByProductIds(rows.map((row) => row.id));
  return rows.map((row) => ({ ...row, ...(stats.get(row.id) ?? EMPTY_SALES_STATS) }));
};

const toWithTotalStockAndSizes = <T extends { sizes: BrandProductSize[] }>({
  sizes,
  ...rest
}: T): Omit<T, "sizes"> & { totalStock: number; sizes: BrandProductSize[] } => ({
  ...rest,
  totalStock: sumStock(sizes),
  sizes: sizes.map(({ id, label, stock }) => ({ id, label, stock })),
});

const withTotalStockAndSizes = <T extends { sizes: BrandProductSize[] }>(
  rows: T[],
): (Omit<T, "sizes"> & { totalStock: number; sizes: BrandProductSize[] })[] =>
  rows.map(toWithTotalStockAndSizes);

export const productRepository = {
  async create(input: CreateProductInput): Promise<ProductWithStockSizesAndImages> {
    const { imageUrls, categoryIds, sizes: sizeInputs, ...rest } = input;
    const product = await prisma.product.create({
      data: {
        ...rest,
        categories: { connect: categoryIds.map((id) => ({ id })) },
        imageUrl: imageUrls?.[0],
        images: imageUrls?.length
          ? { create: imageUrls.map((url, sortOrder) => ({ url, sortOrder })) }
          : undefined,
        sizes: {
          create: sizeInputs.map(({ label, stock, sortOrder }) => ({
            label,
            stock,
            inStock: stock > 0,
            sortOrder,
          })),
        },
      },
      include: { ...withBrandAndCategories, ...withImages, ...withActiveDiscount() },
    });
    return toWithTotalStockAndSizes(product);
  },

  async update(id: string, input: UpdateProductInput): Promise<ProductWithStockSizesAndImages> {
    const { imageUrls, categoryIds, sizes, ...rest } = input;
    const product = await prisma.product.update({
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
        ...(sizes
          ? {
              sizes: {
                deleteMany: {},
                create: sizes.map(({ label, stock, sortOrder }) => ({
                  label,
                  stock,
                  inStock: stock > 0,
                  sortOrder,
                })),
              },
            }
          : {}),
      },
      include: { ...withBrandAndCategories, ...withImages, ...withActiveDiscount() },
    });
    return toWithTotalStockAndSizes(product);
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

  async softDelete(id: string): Promise<void> {
    await prisma.product.update({ where: { id }, data: { deletedAt: new Date() } });
  },

  async findApprovedByIds(ids: string[]): Promise<ProductRecord[]> {
    return prisma.product.findMany({
      where: { id: { in: ids }, status: ProductStatus.APPROVED, deletedAt: null },
    });
  },

  async listByBrandId(
    brandId: string,
    params: { cursor?: string; limit: number },
  ): Promise<ProductWithStockSizesAndImages[]> {
    const rows = await prisma.product.findMany({
      where: { brandId, deletedAt: null },
      include: { ...withBrandAndCategories, ...withImages, ...withActiveDiscount() },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: params.limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
    });
    return withTotalStockAndSizes(rows);
  },

  async listForReview(
    status: ProductStatus,
    params: { cursor?: string; limit: number },
  ): Promise<ProductWithStock[]> {
    const rows = await prisma.product.findMany({
      where: { status, deletedAt: null },
      include: withBrandAndCategories,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: params.limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
    });
    return withTotalStock(rows);
  },

  async listPublic(
    filter: PublicFilter & { cursor?: string; limit: number },
  ): Promise<(ProductWithStock & ProductSalesStats)[]> {
    const orderBy: Prisma.ProductOrderByWithRelationInput[] =
      filter.sort === PRODUCT_SORT.TRENDING
        ? [{ reviewedAt: "desc" }, { id: "desc" }]
        : [{ createdAt: "desc" }, { id: "desc" }];

    const rows = await prisma.product.findMany({
      where: buildPublicWhere(filter),
      include: { ...withBrandAndCategories, ...withActiveDiscount() },
      orderBy,
      take: filter.limit + 1,
      ...(filter.cursor ? { cursor: { id: filter.cursor }, skip: 1 } : {}),
    });
    return withSalesStats(withTotalStock(rows));
  },

  async searchProductIds(params: ProductSearchParams): Promise<ProductSearchResult> {
    const rows = await prisma.$queryRaw<
      { id: string; total_count: bigint; brand_count: bigint }[]
    >(Prisma.sql`
      SELECT id, total_count, brand_count FROM search_products(
        ${params.query},
        ${params.limit},
        ${params.offset},
        ${params.categoryId ?? null}::uuid,
        ${params.productTypeId ?? null}::uuid,
        ${params.brandId ?? null}::uuid,
        ${params.minPrice ?? null}::int,
        ${params.maxPrice ?? null}::int,
        ${params.inStockOnly ?? false}
      )
    `);

    const [first] = rows;
    return {
      ids: rows.map((row) => row.id),
      total: first ? Number(first.total_count) : 0,
      brandCount: first ? Number(first.brand_count) : 0,
    };
  },

  async countPublic(filter: PublicFilter): Promise<{ total: number; brandCount: number }> {
    const where = buildPublicWhere(filter);

    const [total, grouped] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.groupBy({ by: ["brandId"], where }),
    ]);

    return { total, brandCount: grouped.length };
  },

  async listTrending(): Promise<(ProductWithStock & ProductSalesStats)[]> {
    const rows = await prisma.product.findMany({
      where: { status: ProductStatus.APPROVED, deletedAt: null },
      include: { ...withBrandAndCategories, ...withActiveDiscount() },
      orderBy: { reviewedAt: "desc" },
      take: TRENDING_LIMIT,
    });
    return withSalesStats(withTotalStock(rows));
  },

  async listApprovedByIds(ids: string[]): Promise<(ProductWithStock & ProductSalesStats)[]> {
    if (ids.length === 0) return [];

    const rows = await prisma.product.findMany({
      where: { id: { in: ids }, status: ProductStatus.APPROVED, deletedAt: null },
      include: { ...withBrandAndCategories, ...withActiveDiscount() },
    });
    const withStats = await withSalesStats(withTotalStock(rows));

    const byId = new Map(withStats.map((row) => [row.id, row]));
    return ids
      .map((id) => byId.get(id))
      .filter((row): row is (typeof withStats)[number] => row !== undefined);
  },

  async listNewArrivals(): Promise<(ProductWithStock & ProductSalesStats)[]> {
    const rows = await prisma.product.findMany({
      where: {
        status: ProductStatus.APPROVED,
        deletedAt: null,
        createdAt: { gte: new Date(Date.now() - NEW_ARRIVAL_WINDOW_MS) },
      },
      include: { ...withBrandAndCategories, ...withActiveDiscount() },
      orderBy: { createdAt: "desc" },
      take: NEW_ARRIVALS_LIMIT,
    });
    return withSalesStats(withTotalStock(rows));
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
      where: { id, status: ProductStatus.APPROVED, deletedAt: null },
      include: {
        brand: { select: { name: true } },
        categories: { select: { slug: true, name: true } },
        productType: { select: { slug: true, label: true } },
        sizes: { orderBy: { sortOrder: "asc" }, select: { id: true, label: true, stock: true } },
        images: { orderBy: { sortOrder: "asc" }, select: { url: true } },
        ...withActiveDiscount(),
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

  async findSizeIdsForProduct(productId: string, sizeIds: string[]): Promise<string[]> {
    const sizes = await prisma.productSize.findMany({
      where: { productId, id: { in: sizeIds } },
      select: { id: true },
    });
    return sizes.map((size) => size.id);
  },

  async listSizesForProduct(productId: string): Promise<BrandProductSize[]> {
    return prisma.productSize.findMany({
      where: { productId },
      orderBy: { sortOrder: "asc" },
      select: { id: true, label: true, stock: true },
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
            creator: {
              select: { id: true, name: true, handle: true, heightCm: true, showHeight: true },
            },
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
        heightCm: creator.showHeight ? creator.heightCm : null,
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

  async refreshRatingSummary(productId: string): Promise<void> {
    const grouped = await prisma.productReview.groupBy({
      by: ["rating"],
      where: { productId, deletedAt: null },
      _count: { _all: true },
    });

    const ratingCounts: Record<RatingCountField, number> = {
      rating1Count: 0,
      rating2Count: 0,
      rating3Count: 0,
      rating4Count: 0,
      rating5Count: 0,
    };
    let reviewCount = 0;
    let weightedSum = 0;
    for (const {
      rating,
      _count: { _all: count },
    } of grouped) {
      if (rating < PRODUCT_RATING_MIN || rating > PRODUCT_RATING_MAX) continue;
      const field = RATING_COUNT_FIELD_BY_VALUE[rating];
      if (!field) continue;
      ratingCounts[field] = count;
      reviewCount += count;
      weightedSum += rating * count;
    }

    await prisma.product.update({
      where: { id: productId },
      data: {
        ...ratingCounts,
        reviewCount,
        avgRating: reviewCount > 0 ? weightedSum / reviewCount : null,
      },
    });
  },

  async listProductIdsTaggedByCreator(creatorId: string): Promise<string[]> {
    const rows = await prisma.creatorLookProduct.findMany({
      where: { creatorLook: { creatorId } },
      select: { productId: true },
      distinct: ["productId"],
    });
    return rows.map((row) => row.productId);
  },

  async findActiveDiscount(productId: string): Promise<ProductDiscountRecord | null> {
    const now = new Date();
    return prisma.productDiscount.findFirst({
      where: {
        productId,
        isActive: true,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gte: now } }],
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async findEligibilityAttributesByIds(
    productIds: string[],
  ): Promise<Map<string, { brandId: string; productTypeId: string; categoryIds: string[] }>> {
    if (productIds.length === 0) return new Map();

    const rows = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        brandId: true,
        productTypeId: true,
        categories: { select: { id: true } },
      },
    });

    return new Map(
      rows.map((row) => [
        row.id,
        {
          brandId: row.brandId,
          productTypeId: row.productTypeId,
          categoryIds: row.categories.map((category) => category.id),
        },
      ]),
    );
  },

  async findActiveDiscountsByProductIds(
    productIds: string[],
    at: Date,
  ): Promise<Map<string, ProductDiscountRecord & { productId: string }>> {
    if (productIds.length === 0) return new Map();

    const rows = await prisma.productDiscount.findMany({
      where: {
        productId: { in: productIds },
        isActive: true,
        startsAt: { lte: at },
        OR: [{ endsAt: null }, { endsAt: { gte: at } }],
      },
      orderBy: { createdAt: "desc" },
    });

    const byProductId = new Map<string, ProductDiscountRecord & { productId: string }>();
    for (const row of rows) {
      if (!byProductId.has(row.productId)) byProductId.set(row.productId, row);
    }
    return byProductId;
  },

  async createDiscount(
    productId: string,
    input: SetProductDiscountInput,
  ): Promise<ProductDiscountRecord> {
    return prisma.$transaction(async (tx) => {
      await tx.productDiscount.updateMany({
        where: { productId, isActive: true },
        data: { isActive: false },
      });
      return tx.productDiscount.create({ data: { productId, ...input } });
    });
  },

  async updateDiscount(
    id: string,
    input: UpdateProductDiscountInput,
  ): Promise<ProductDiscountRecord> {
    return prisma.productDiscount.update({ where: { id }, data: input });
  },

  async deactivateDiscount(id: string): Promise<void> {
    await prisma.productDiscount.update({ where: { id }, data: { isActive: false } });
  },
};
