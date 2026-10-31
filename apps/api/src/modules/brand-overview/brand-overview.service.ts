import { brandPayoutService } from "#modules/brand-payouts/brand-payout.service.js";
import { toBrandFulfilmentGroupSummaryView } from "#modules/orders/fulfilment-groups/fulfilment-group.utils.js";
import { orderRepository } from "#modules/orders/order.repository.js";

import { RECENT_ORDER_LIMIT } from "./brand-overview.constants.js";
import { brandOverviewRepository } from "./brand-overview.repository.js";
import type { BrandOverview } from "./brand-overview.types.js";

export const brandOverviewService = {
  async getOverview(brandId: string, periodDays: number): Promise<BrandOverview> {
    const [
      revenueWindows,
      trend,
      catalogCounts,
      unfulfilledItemCount,
      payoutSummary,
      recentRows,
      topProducts,
      lowStockProducts,
    ] = await Promise.all([
      brandOverviewRepository.getRevenueWindows(brandId, periodDays),
      brandOverviewRepository.getDailyTrend(brandId, periodDays),
      brandOverviewRepository.getCatalogCounts(brandId),
      brandOverviewRepository.getUnfulfilledItemCount(brandId),
      brandPayoutService.getSummary(brandId),
      orderRepository.listFulfilmentGroupsForBrand(brandId, { limit: RECENT_ORDER_LIMIT }),
      brandOverviewRepository.getTopProducts(brandId, periodDays),
      brandOverviewRepository.getLowStockProducts(brandId),
    ]);

    return {
      kpis: {
        lifetimeRevenue: revenueWindows.lifetime,
        periodDays,
        periodRevenue: revenueWindows.period,
        previousPeriodRevenue: revenueWindows.previousPeriod,
        periodOrderCount: revenueWindows.periodOrderCount,
        availablePayout: payoutSummary.available,
        pendingPayout: payoutSummary.pending,
        productCount: catalogCounts.productCount,
        lowStockCount: catalogCounts.lowStockCount,
        unfulfilledItemCount,
      },
      trend,
      topProducts,
      lowStockProducts,
      recentOrders: recentRows.slice(0, RECENT_ORDER_LIMIT).map(toBrandFulfilmentGroupSummaryView),
    };
  },
};
