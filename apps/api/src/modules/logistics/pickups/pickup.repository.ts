import { prisma } from "#db/prisma.js";
import { FulfilmentMode } from "#generated/prisma/enums.js";

export const logisticsPickupRepository = {
  async findBrandHubPickup(fulfilmentGroupId: string, brandId: string) {
    return prisma.orderFulfilmentGroup.findFirst({
      where: {
        id: fulfilmentGroupId,
        brandId,
        fulfilmentMode: FulfilmentMode.OUTFIQE_LOGISTICS,
      },
      select: {
        id: true,
        status: true,
        pickupStatus: true,
        pickupCode: true,
        readyForPickupAt: true,
        order: { select: { paymentStatus: true } },
      },
    });
  },
};
