import { prisma } from "#db/prisma.js";
import { AccountStatus, ProductStatus } from "#generated/prisma/enums.js";

export type BuyableSize = { productId: string; label: string; sizeId: string; stock: number };

export const outfitCartRepository = {
  async listBuyableSizes(productIds: string[]): Promise<BuyableSize[]> {
    const sizes = await prisma.productSize.findMany({
      where: {
        productId: { in: productIds },
        product: {
          status: ProductStatus.APPROVED,
          deletedAt: null,
          brand: { accountStatus: AccountStatus.ACTIVE },
        },
      },
      select: { id: true, productId: true, label: true, stock: true },
    });
    return sizes.map(({ id, productId, label, stock }) => ({
      productId,
      label,
      sizeId: id,
      stock,
    }));
  },

  async recordVisits(
    userId: string,
    outfitId: string,
    outfitVersion: number,
    productIds: string[],
  ): Promise<void> {
    await prisma.outfitBuildVisit.createMany({
      data: productIds.map((productId) => ({ userId, outfitId, outfitVersion, productId })),
    });
  },
};
