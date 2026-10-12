import { prisma } from "#db/prisma.js";
import { AccountStatus, ProductStatus } from "#generated/prisma/enums.js";
import { toFitColumns } from "#lib/fit-range.utils.js";
import type { DbClient } from "#types/db.types.js";

import { productCatalogRepository } from "./catalog/catalog.repository.js";
import { productDiscountRepository } from "./discounts/discount.repository.js";
import { productInventoryRepository } from "./inventory/inventory.repository.js";
import {
  toWithTotalStockAndSizes,
  withActiveDiscount,
  withBrandAndCategories,
  withTotalStockAndSizes,
} from "./product.query-helpers.js";
import type {
  CreateProductInput,
  ProductForReview,
  ProductRecord,
  ProductWithStockSizesAndImages,
  SizeChartEntry,
  UpdateProductInput,
} from "./product.types.js";
import { productSocialProofRepository } from "./social-proof/social-proof.repository.js";

export type { DbClient } from "#types/db.types.js";

const withImages = {
  images: { orderBy: { sortOrder: "asc" as const }, select: { url: true } },
};

export const productRepository = {
  async create(
    client: DbClient,
    input: CreateProductInput,
  ): Promise<ProductWithStockSizesAndImages> {
    const { imageUrls, imageAssetIds, categoryIds, sizes: sizeInputs, ...rest } = input;
    const product = await client.product.create({
      data: {
        ...rest,
        categories: { connect: categoryIds.map((id) => ({ id })) },
        imageUrl: imageUrls?.[0],
        images: imageUrls?.length
          ? {
              create: imageUrls.map((url, sortOrder) => ({
                url,
                sortOrder,
                imageAssetId: imageAssetIds?.[sortOrder] ?? null,
              })),
            }
          : undefined,
        sizes: {
          create: sizeInputs.map(({ label, stock, sortOrder, fitRange }) => ({
            label,
            stock,
            inStock: stock > 0,
            sortOrder,
            ...toFitColumns(fitRange),
          })),
        },
      },
      include: { ...withBrandAndCategories, ...withImages, ...withActiveDiscount() },
    });
    return toWithTotalStockAndSizes(product);
  },

  async update(
    client: DbClient,
    id: string,
    input: UpdateProductInput,
  ): Promise<ProductWithStockSizesAndImages> {
    const { imageUrls, imageAssetIds, categoryIds, sizes, ...rest } = input;
    const product = await client.product.update({
      where: { id },
      data: {
        ...rest,
        ...(categoryIds ? { categories: { set: categoryIds.map((id) => ({ id })) } } : {}),
        ...(imageUrls
          ? {
              imageUrl: imageUrls[0],
              images: {
                deleteMany: {},
                create: imageUrls.map((url, sortOrder) => ({
                  url,
                  sortOrder,
                  imageAssetId: imageAssetIds?.[sortOrder] ?? null,
                })),
              },
            }
          : {}),
        ...(sizes
          ? {
              sizes: {
                deleteMany: {},
                create: sizes.map(({ label, stock, sortOrder, fitRange }) => ({
                  label,
                  stock,
                  inStock: stock > 0,
                  sortOrder,
                  ...toFitColumns(fitRange),
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
      where: {
        id: { in: ids },
        status: ProductStatus.APPROVED,
        deletedAt: null,
        brand: { accountStatus: AccountStatus.ACTIVE },
      },
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
    params: { cursor?: string; limit: number; isThrift?: boolean },
  ): Promise<ProductForReview[]> {
    const rows = await prisma.product.findMany({
      where: { status, deletedAt: null, isThrift: params.isThrift },
      include: {
        ...withBrandAndCategories,
        productType: { select: { slug: true, label: true, supportsFitRanges: true } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: params.limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
    });
    return withTotalStockAndSizes(rows);
  },

  async updateSizeChart(
    client: DbClient,
    productId: string,
    isStretchable: boolean | null,
    sizeChartEntries: SizeChartEntry[],
  ): Promise<{ updatedSizeCount: number; product: ProductWithStockSizesAndImages }> {
    let updatedSizeCount = 0;
    for (const { sizeId, fitRange } of sizeChartEntries) {
      const { count } = await client.productSize.updateMany({
        where: { id: sizeId, productId },
        data: toFitColumns(fitRange),
      });
      updatedSizeCount += count;
    }
    const product = await client.product.update({
      where: { id: productId },
      data: { isStretchable },
      include: { ...withBrandAndCategories, ...withImages, ...withActiveDiscount() },
    });
    return { updatedSizeCount, product: toWithTotalStockAndSizes(product) };
  },

  ...productCatalogRepository,

  ...productInventoryRepository,

  ...productSocialProofRepository,

  ...productDiscountRepository,
};
