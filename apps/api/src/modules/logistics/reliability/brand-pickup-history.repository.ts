import { prisma } from "#db/prisma.js";
import { FulfilmentMode } from "#generated/prisma/enums.js";

const NO_PICKUPS = 0;

export type BrandPickupHistory = {
  firstPickupAt: Date | null;
  totalPickupCount: number;
  recentPickupCount: number;
};

export const EMPTY_PICKUP_HISTORY: BrandPickupHistory = {
  firstPickupAt: null,
  totalPickupCount: NO_PICKUPS,
  recentPickupCount: NO_PICKUPS,
};

export const brandPickupHistoryRepository = {
  async summarizeHubPickups(
    brandIds: readonly string[],
    since: Date,
  ): Promise<Map<string, BrandPickupHistory>> {
    const hubPickupsOfBrands = {
      brandId: { in: [...brandIds] },
      fulfilmentMode: FulfilmentMode.OUTFIQE_LOGISTICS,
    };
    const [allTimeByBrand, recentByBrand] = await Promise.all([
      prisma.orderFulfilmentGroup.groupBy({
        by: ["brandId"],
        where: hubPickupsOfBrands,
        _count: { _all: true },
        _min: { createdAt: true },
      }),
      prisma.orderFulfilmentGroup.groupBy({
        by: ["brandId"],
        where: { ...hubPickupsOfBrands, createdAt: { gte: since } },
        _count: { _all: true },
      }),
    ]);
    const recentCountByBrand = new Map(
      recentByBrand.map(({ brandId, _count }) => [brandId, _count._all]),
    );
    const allTimeSummaryByBrand = new Map(
      allTimeByBrand.map((summary) => [summary.brandId, summary]),
    );
    return new Map(
      brandIds.map((brandId) => {
        const allTime = allTimeSummaryByBrand.get(brandId);
        return [
          brandId,
          allTime
            ? {
                firstPickupAt: allTime._min.createdAt,
                totalPickupCount: allTime._count._all,
                recentPickupCount: recentCountByBrand.get(brandId) ?? NO_PICKUPS,
              }
            : EMPTY_PICKUP_HISTORY,
        ];
      }),
    );
  },
};
