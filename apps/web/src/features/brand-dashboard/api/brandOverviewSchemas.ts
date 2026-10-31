import { z } from "zod";

import { brandShipmentSummarySchema } from "../shipments/api/brandFulfilmentSchemas";

export const brandOverviewKpisSchema = z.object({
  lifetimeRevenue: z.number(),
  periodDays: z.number(),
  periodRevenue: z.number(),
  previousPeriodRevenue: z.number(),
  periodOrderCount: z.number(),
  availablePayout: z.number(),
  pendingPayout: z.number(),
  productCount: z.number(),
  lowStockCount: z.number(),
  unfulfilledItemCount: z.number(),
});
export type BrandOverviewKpis = z.infer<typeof brandOverviewKpisSchema>;

export const brandOverviewTrendPointSchema = z.object({
  date: z.string(),
  revenue: z.number(),
  orderCount: z.number(),
});
export type BrandOverviewTrendPoint = z.infer<typeof brandOverviewTrendPointSchema>;

const brandTopProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  imageUrl: z.string().nullable(),
  unitsSold: z.number(),
  revenue: z.number(),
});

const brandLowStockProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  imageUrl: z.string().nullable(),
  stockLeft: z.number(),
});

export const brandOverviewSchema = z.object({
  kpis: brandOverviewKpisSchema,
  trend: z.array(brandOverviewTrendPointSchema),
  topProducts: z.array(brandTopProductSchema),
  lowStockProducts: z.array(brandLowStockProductSchema),
  recentOrders: z.array(brandShipmentSummarySchema),
});
export type BrandOverview = z.infer<typeof brandOverviewSchema>;
