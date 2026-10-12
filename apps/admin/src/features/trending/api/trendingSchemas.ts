import { z } from "zod";

export const productSearchResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  brand: z.string(),
  price: z.number(),
});
export type ProductSearchResult = z.infer<typeof productSearchResultSchema>;

export const trendingProductSummarySchema = z.object({
  productId: z.string(),
  name: z.string(),
  brand: z.string(),
  imageUrl: z.string().nullable(),
  score: z.number(),
  rank: z.number(),
});
export type TrendingProductSummary = z.infer<typeof trendingProductSummarySchema>;

export type TrendDebugSubject = { id: string; name: string; brand: string };

export const baselineSourceSchema = z.enum(["product", "category", "global"]);
export type BaselineSourceValue = z.infer<typeof baselineSourceSchema>;

export const trendDebugSnapshotSchema = z.object({
  productId: z.string(),
  brandId: z.string(),
  recentActivity: z.object({
    purchaseUnits: z.number(),
    cartAdds: z.number(),
    saves: z.number(),
    creatorTags: z.number(),
    tagClicks: z.number(),
  }),
  decayedActivity: z.number(),
  previousWindowActivity: z.number(),
  velocity: z.number(),
  baseline: z.object({ source: baselineSourceSchema, value: z.number() }),
  baselineLift: z.number(),
  momentum: z.number(),
  freshnessMultiplier: z.number(),
  score: z.number(),
  rank: z.number().nullable(),
  scoredAt: z.string(),
});
export type TrendDebugSnapshot = z.infer<typeof trendDebugSnapshotSchema>;
