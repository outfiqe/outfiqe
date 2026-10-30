import { prismaRead } from "#db/prisma.js";
import { isUuid } from "#lib/uuid.utils.js";

const NO_CREATORS = 0;
const NO_PRODUCTS = 0;

export type CreatorName = { id: string; name: string; handle: string };
export type ProductName = { id: string; name: string };

export const productAnalyticsInsightsRepository = {
  findCreatorNames(creatorIds: string[]): Promise<CreatorName[]> {
    const validCreatorIds = creatorIds.filter(isUuid);
    if (validCreatorIds.length === NO_CREATORS) return Promise.resolve([]);
    return prismaRead.user.findMany({
      where: { id: { in: validCreatorIds } },
      select: { id: true, name: true, handle: true },
    });
  },

  findProductNames(productIds: string[]): Promise<ProductName[]> {
    if (productIds.length === NO_PRODUCTS) return Promise.resolve([]);
    return prismaRead.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    });
  },
};
