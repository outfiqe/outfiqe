import type { ProductType } from "#generated/prisma/enums.js";

export type MetricBucket = {
  productId: string;
  bucketStart: Date;
  purchaseUnits: number;
  cartAdds: number;
  saves: number;
  creatorTags: number;
  tagClicks: number;
};

export type ProductTrendMeta = {
  id: string;
  brandId: string;
  type: ProductType;
  createdAt: Date;
};

export type BaselineSource = "product" | "category" | "global";

export type ProductScoreBreakdown = {
  productId: string;
  brandId: string;
  recentActivity: {
    purchaseUnits: number;
    cartAdds: number;
    saves: number;
    creatorTags: number;
    tagClicks: number;
  };
  decayedActivity: number;
  previousWindowActivity: number;
  velocity: number;
  baseline: { source: BaselineSource; value: number };
  baselineLift: number;
  momentum: number;
  freshnessMultiplier: number;
  score: number;
};

export type TrendDebugSnapshot = ProductScoreBreakdown & {
  rank: number | null;
  scoredAt: Date;
};

export type TrendingEntry = { productId: string; score: number };

export type TrendingSnapshotCursor = { sessionId: string; offset: number };

export type TrendingProductPage = { ids: string[]; nextCursor: string | null };
