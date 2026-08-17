import { z } from "zod";

const DEFAULT_TOP_LIMIT = 20;
const MAX_TOP_LIMIT = 50;

export const trendDebugParamSchema = z.object({ productId: z.uuid() });

export const listTopTrendingQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_TOP_LIMIT).default(DEFAULT_TOP_LIMIT),
});

export type TrendDebugParam = z.infer<typeof trendDebugParamSchema>;
export type ListTopTrendingQuery = z.infer<typeof listTopTrendingQuerySchema>;
