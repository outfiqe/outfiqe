import { PRODUCT_SORT, type ProductSort } from "@outfiqe/utils";

import { prisma } from "#db/prisma.js";
import { Prisma } from "#generated/prisma/client.js";
import { AccountStatus, ProductStatus } from "#generated/prisma/enums.js";
import { RESPONSIVE_IMAGE_ASSET_SELECT } from "#lib/responsive-image.utils.js";

import { NEW_ARRIVAL_WINDOW_MS, TRENDING_LIMIT } from "../product.constants.js";
import {
  withActiveDiscount,
  withBrandAndCategories,
  withTotalStock,
} from "../product.query-helpers.js";
import type {
  ProductFirstImageAsset,
  ProductSalesStats,
  ProductSearchParams,
  ProductSearchResult,
  ProductSizeRecord,
  ProductWithStock,
} from "../product.types.js";
import { sumStock } from "../product.utils.js";

const NEW_ARRIVALS_LIMIT = 10;

const imageAssetSelect = { select: RESPONSIVE_IMAGE_ASSET_SELECT } as const;

const withFirstImageAsset = {
  images: {
    orderBy: { sortOrder: "asc" as const },
    take: 1,
    select: { imageAsset: imageAssetSelect },
  },
};

const withGalleryImageAssets = {
  images: {
    orderBy: { sortOrder: "asc" as const },
    select: { url: true, imageAsset: imageAssetSelect },
  },
};

type PublicFilter = {
  categoryId?: string;
  productTypeId?: string;
  brandId?: string;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  thrift?: boolean;
  sort?: ProductSort;
};

const excludeSoldOutThrift: Prisma.ProductWhereInput = {
  isThrift: true,
  sizes: { every: { stock: { lte: 0 } } },
};

const buildPublicWhere = (filter: PublicFilter): Prisma.ProductWhereInput => ({
  status: ProductStatus.APPROVED,
  deletedAt: null,
  brand: { accountStatus: AccountStatus.ACTIVE },
  categories: filter.categoryId ? { some: { id: filter.categoryId } } : undefined,
  productTypeId: filter.productTypeId,
  brandId: filter.brandId,
  isThrift: filter.thrift,
  price:
    filter.minPrice !== undefined || filter.maxPrice !== undefined
      ? { gte: filter.minPrice, lte: filter.maxPrice }
      : undefined,
  sizes: filter.inStockOnly ? { some: { stock: { gt: 0 } } } : undefined,
  createdAt:
    filter.sort === PRODUCT_SORT.NEW_ARRIVALS
      ? { gte: new Date(Date.now() - NEW_ARRIVAL_WINDOW_MS) }
      : undefined,
  discounts:
    filter.sort === PRODUCT_SORT.ON_SALE
      ? { some: withActiveDiscount().discounts.where }
      : undefined,
  NOT: excludeSoldOutThrift,
});

const EMPTY_SALES_STATS: ProductSalesStats = { creatorBuyerCount: 0, unitsSold: 0 };

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

export const productCatalogRepository = {
  async listPublic(
    filter: PublicFilter & { cursor?: string; limit: number },
  ): Promise<(ProductWithStock & ProductSalesStats)[]> {
    const orderBy: Prisma.ProductOrderByWithRelationInput[] =
      filter.sort === PRODUCT_SORT.TRENDING
        ? [{ reviewedAt: "desc" }, { id: "desc" }]
        : [{ createdAt: "desc" }, { id: "desc" }];

    const rows = await prisma.product.findMany({
      where: buildPublicWhere(filter),
      include: { ...withBrandAndCategories, ...withFirstImageAsset, ...withActiveDiscount() },
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
        ${params.inStockOnly ?? false},
        ${params.thrift ?? null}
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
      where: {
        status: ProductStatus.APPROVED,
        deletedAt: null,
        brand: { accountStatus: AccountStatus.ACTIVE },
        NOT: excludeSoldOutThrift,
      },
      include: { ...withBrandAndCategories, ...withFirstImageAsset, ...withActiveDiscount() },
      orderBy: { reviewedAt: "desc" },
      take: TRENDING_LIMIT,
    });
    return withSalesStats(withTotalStock(rows));
  },

  async listApprovedByIds(ids: string[]): Promise<(ProductWithStock & ProductSalesStats)[]> {
    if (ids.length === 0) return [];

    const rows = await prisma.product.findMany({
      where: {
        id: { in: ids },
        status: ProductStatus.APPROVED,
        deletedAt: null,
        brand: { accountStatus: AccountStatus.ACTIVE },
        NOT: excludeSoldOutThrift,
      },
      include: { ...withBrandAndCategories, ...withFirstImageAsset, ...withActiveDiscount() },
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
        brand: { accountStatus: AccountStatus.ACTIVE },
        createdAt: { gte: new Date(Date.now() - NEW_ARRIVAL_WINDOW_MS) },
        NOT: excludeSoldOutThrift,
      },
      include: { ...withBrandAndCategories, ...withFirstImageAsset, ...withActiveDiscount() },
      orderBy: { createdAt: "desc" },
      take: NEW_ARRIVALS_LIMIT,
    });
    return withSalesStats(withTotalStock(rows));
  },

  async findPublicById(id: string): Promise<
    | (ProductWithStock & {
        brandId: string;
        sizes: ProductSizeRecord[];
        images: (ProductFirstImageAsset & { url: string })[];
      })
    | null
  > {
    const product = await prisma.product.findFirst({
      where: {
        id,
        status: ProductStatus.APPROVED,
        deletedAt: null,
        brand: { accountStatus: AccountStatus.ACTIVE },
      },
      include: {
        brand: { select: { name: true } },
        categories: { select: { slug: true, name: true } },
        productType: { select: { slug: true, label: true } },
        sizes: { orderBy: { sortOrder: "asc" }, select: { id: true, label: true, stock: true } },
        ...withGalleryImageAssets,
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
};
