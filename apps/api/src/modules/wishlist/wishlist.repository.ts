import { prisma } from "../../shared/db/prisma.js";

import { ProductStatus } from "../../generated/prisma/enums.js";
import type { ProductWithBrand } from "../products/product.types.js";

export const wishlistRepository = {
  async save(userId: string, productId: string): Promise<boolean> {
    const existing = await prisma.savedProduct.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    if (existing) return false;

    await prisma.savedProduct.create({ data: { userId, productId } });
    return true;
  },

  async unsave(userId: string, productId: string): Promise<boolean> {
    const existing = await prisma.savedProduct.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    if (!existing) return false;

    await prisma.savedProduct.delete({ where: { userId_productId: { userId, productId } } });
    return true;
  },

  async count(userId: string): Promise<number> {
    return prisma.savedProduct.count({
      where: { userId, product: { status: ProductStatus.APPROVED } },
    });
  },

  async isSaved(userId: string, productId: string): Promise<boolean> {
    const existing = await prisma.savedProduct.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    return existing !== null;
  },

  async listSaved(
    userId: string,
    params: { cursor?: string; limit: number },
  ): Promise<{ products: ProductWithBrand[]; hasMore: boolean }> {
    const rows = await prisma.savedProduct.findMany({
      where: { userId, product: { status: ProductStatus.APPROVED } },
      orderBy: [{ createdAt: "desc" }, { productId: "desc" }],
      take: params.limit + 1,
      ...(params.cursor
        ? { cursor: { userId_productId: { userId, productId: params.cursor } }, skip: 1 }
        : {}),
      include: { product: { include: { brand: { select: { name: true } } } } },
    });

    const hasMore = rows.length > params.limit;
    const page = hasMore ? rows.slice(0, params.limit) : rows;
    return { products: page.map((row) => row.product), hasMore };
  },
};
