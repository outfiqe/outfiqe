import type { BrandFulfilmentGroupSummaryView } from "#modules/orders/order.types.js";

export type BrandOverviewKpis = {
  lifetimeRevenue: number;
  periodDays: number;
  periodRevenue: number;
  previousPeriodRevenue: number;
  periodOrderCount: number;
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

export type BrandTopProduct = {
  id: string;
  name: string;
  imageUrl: string | null;
  unitsSold: number;
  revenue: number;
};

export type BrandLowStockProduct = {
  id: string;
  name: string;
  imageUrl: string | null;
  stockLeft: number;
};

export type BrandOverview = {
  kpis: BrandOverviewKpis;
  trend: BrandOverviewTrendPoint[];
  topProducts: BrandTopProduct[];
  lowStockProducts: BrandLowStockProduct[];
  recentOrders: BrandFulfilmentGroupSummaryView[];
};

export type RevenueWindows = {
  lifetime: number;
  period: number;
  previousPeriod: number;
  periodOrderCount: number;
};

export type CatalogCounts = {
  productCount: number;
  lowStockCount: number;
};
