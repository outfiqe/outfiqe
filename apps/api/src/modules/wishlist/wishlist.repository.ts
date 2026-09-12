import { prisma } from "#db/prisma.js";
import { ProductStatus } from "#generated/prisma/enums.js";
import type { ProductWithBrand } from "#modules/products/product.types.js";

export const wishlistRepository = {
  async save(userId: string, productId: string): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.savedProduct.findUnique({
        where: { userId_productId: { userId, productId } },
      });
      if (existing) return false;

      await tx.savedProduct.create({ data: { userId, productId } });
      return true;
    });
  },

  async unsave(userId: string, productId: string): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.savedProduct.findUnique({
        where: { userId_productId: { userId, productId } },
      });
      if (!existing) return false;

      await tx.savedProduct.delete({ where: { userId_productId: { userId, productId } } });
      return true;
    });
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

  async listSavedProductIds(userId: string, productIds: string[]): Promise<Set<string>> {
    if (productIds.length === 0) return new Set();

    const rows = await prisma.savedProduct.findMany({
      where: { userId, productId: { in: productIds } },
      select: { productId: true },
    });
    return new Set(rows.map((row) => row.productId));
  },

  async listSaved(
    userId: string,
    params: { cursor?: string; limit: number },
  ): Promise<{ product: ProductWithBrand; productId: string }[]> {
    return prisma.savedProduct.findMany({
      where: { userId, product: { status: ProductStatus.APPROVED } },
      orderBy: [{ createdAt: "desc" }, { productId: "desc" }],
      take: params.limit + 1,
      ...(params.cursor
        ? { cursor: { userId_productId: { userId, productId: params.cursor } }, skip: 1 }
        : {}),
      include: {
        product: {
          include: {
            brand: { select: { name: true } },
            categories: { select: { slug: true, name: true } },
            productType: { select: { slug: true, label: true } },
          },
        },
      },
    });
  },
};
