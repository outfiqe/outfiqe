import { prisma } from "#db/prisma.js";

import type {
  ProductDiscountRecord,
  SetProductDiscountInput,
  UpdateProductDiscountInput,
} from "../product.types.js";

export const productDiscountRepository = {
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
