import { brandPayoutService } from "#modules/brand-payouts/brandPayout.service.js";
import { orderRepository } from "#modules/orders/order.repository.js";
import { toBrandOrderItemView } from "#modules/orders/order.utils.js";

import { RECENT_ORDER_LIMIT } from "./brand-overview.constants.js";
import { brandOverviewRepository } from "./brand-overview.repository.js";
import type { BrandOverview } from "./brand-overview.types.js";

export const brandOverviewService = {
  async getOverview(brandId: string): Promise<BrandOverview> {
    const [revenueWindows, trend, catalogCounts, unfulfilledItemCount, payoutSummary, recentRows] =
      await Promise.all([
        brandOverviewRepository.getRevenueWindows(brandId),
        brandOverviewRepository.getDailyTrend(brandId),
        brandOverviewRepository.getCatalogCounts(brandId),
        brandOverviewRepository.getUnfulfilledItemCount(brandId),
        brandPayoutService.getSummary(brandId),
        orderRepository.listItemsForBrand(brandId, { limit: RECENT_ORDER_LIMIT }),
      ]);

    return {
      kpis: {
        lifetimeRevenue: revenueWindows.lifetime,
        last30DaysRevenue: revenueWindows.last30,
        previous30DaysRevenue: revenueWindows.previous30,
        availablePayout: payoutSummary.available,
        pendingPayout: payoutSummary.pending,
        productCount: catalogCounts.productCount,
        lowStockCount: catalogCounts.lowStockCount,
        unfulfilledItemCount,
      },
      trend,
      recentOrders: recentRows.slice(0, RECENT_ORDER_LIMIT).map(toBrandOrderItemView),
    };
  },
};
