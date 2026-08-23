import { z } from "zod";

import { apiClient } from "@/lib/apiClient";

import {
  type ProductReviewPage,
  productReviewPageSchema,
  type ProductSuggestion,
  productSuggestionSchema,
} from "./schemas";

const suggestionListSchema = z.array(productSuggestionSchema);

export const productReviewsApi = {
  async searchProducts(query: string): Promise<ProductSuggestion[]> {
    const res = await apiClient.get<ProductSuggestion[]>(
      `/products/autocomplete?q=${encodeURIComponent(query)}`,
    );
    return suggestionListSchema.parse(res.data);
  },

  async list(productId: string, cursor?: string): Promise<ProductReviewPage> {
    const params = new URLSearchParams({ sort: "newest" });
    if (cursor) params.set("cursor", cursor);

    const res = await apiClient.get<ProductReviewPage>(
      `/products/${productId}/reviews?${params.toString()}`,
    );
    return productReviewPageSchema.parse(res.data);
  },

  async remove(productId: string, reviewId: string): Promise<void> {
    await apiClient.del(`/products/${productId}/reviews/${reviewId}`);
  },
};
