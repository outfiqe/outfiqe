import { prisma } from "#db/prisma.js";
import { ProductStatus } from "#generated/prisma/enums.js";
import type { ProductWithBrand } from "#modules/products/product.types.js";

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
