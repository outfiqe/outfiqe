import type { BrandOrderItemView } from "#modules/orders/order.types.js";

export type BrandOverviewKpis = {
  lifetimeRevenue: number;
  last30DaysRevenue: number;
  previous30DaysRevenue: number;
  availablePayout: number;
  pendingPayout: number;
  productCount: number;
  lowStockCount: number;
  unfulfilledItemCount: number;
};

export type BrandOverviewTrendPoint = {
  date: string;
  revenue: number;
  orderCount: number;
};

export type BrandOverview = {
  kpis: BrandOverviewKpis;
  trend: BrandOverviewTrendPoint[];
  recentOrders: BrandOrderItemView[];
};

export type RevenueWindows = {
  lifetime: number;
  last30: number;
  previous30: number;
};

export type CatalogCounts = {
  productCount: number;
  lowStockCount: number;
};
