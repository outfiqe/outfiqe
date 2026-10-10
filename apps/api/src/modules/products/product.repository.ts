import { prisma } from "#db/prisma.js";
import { AccountStatus, ProductStatus } from "#generated/prisma/enums.js";
import type { DbClient } from "#types/db.types.js";

import { productCatalogRepository } from "./catalog/catalog.repository.js";
import { productDiscountRepository } from "./discounts/discount.repository.js";
import { productInventoryRepository } from "./inventory/inventory.repository.js";
import {
  withActiveDiscount,
  withBrandAndCategories,
  withTotalStock,
} from "./product.query-helpers.js";
import type {
  BrandProductSize,
  CreateProductInput,
  ProductRecord,
  ProductWithStock,
  ProductWithStockSizesAndImages,
  UpdateProductInput,
} from "./product.types.js";
import { sumStock } from "./product.utils.js";
import { productSocialProofRepository } from "./social-proof/social-proof.repository.js";

export type { DbClient } from "#types/db.types.js";

const withImages = {
  images: { orderBy: { sortOrder: "asc" as const }, select: { url: true } },
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
  ): Promise<ProductWithStock[]> {
    const rows = await prisma.product.findMany({
      where: { status, deletedAt: null, isThrift: params.isThrift },
      include: withBrandAndCategories,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: params.limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
    });
    return withTotalStock(rows);
  },

  ...productCatalogRepository,

  ...productInventoryRepository,

  ...productSocialProofRepository,

  ...productDiscountRepository,
};
