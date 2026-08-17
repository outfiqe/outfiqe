import { z } from "zod";

import { apiClient } from "@/lib/apiClient";

import {
  type ProductSearchResult,
  productSearchResultSchema,
  type TrendDebugSnapshot,
  trendDebugSnapshotSchema,
  type TrendingProductSummary,
  trendingProductSummarySchema,
} from "./schemas";

const productSearchSchema = z.object({ products: z.array(productSearchResultSchema) });
const topTrendingSchema = z.array(trendingProductSummarySchema);

const TOP_TRENDING_LIMIT = 20;

export const trendingApi = {
  async searchProducts(query: string): Promise<ProductSearchResult[]> {
    if (!query.trim()) return [];
    const res = await apiClient.get<z.infer<typeof productSearchSchema>>(
      `/products?q=${encodeURIComponent(query)}`,
    );
    return productSearchSchema.parse(res.data).products;
  },

  async listTopTrending(): Promise<TrendingProductSummary[]> {
    const res = await apiClient.get<TrendingProductSummary[]>(
      `/admin/trending/products?limit=${TOP_TRENDING_LIMIT}`,
    );
    return topTrendingSchema.parse(res.data);
  },

  async getDebugSnapshot(productId: string): Promise<TrendDebugSnapshot> {
    const res = await apiClient.get<TrendDebugSnapshot>(
      `/admin/trending/products/${productId}/debug`,
    );
    return trendDebugSnapshotSchema.parse(res.data);
  },
};
