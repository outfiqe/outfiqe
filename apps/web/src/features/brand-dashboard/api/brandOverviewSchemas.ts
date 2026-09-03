import { z } from "zod";

import { brandOrderItemSchema } from "./brandOrdersSchemas";

export const brandOverviewKpisSchema = z.object({
  lifetimeRevenue: z.number(),
  last30DaysRevenue: z.number(),
  previous30DaysRevenue: z.number(),
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

export const brandOverviewSchema = z.object({
  kpis: brandOverviewKpisSchema,
  trend: z.array(brandOverviewTrendPointSchema),
  recentOrders: z.array(brandOrderItemSchema),
});
export type BrandOverview = z.infer<typeof brandOverviewSchema>;
