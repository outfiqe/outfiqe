"use client";

import { useQuery } from "@tanstack/react-query";

import { productDetailApi } from "@/features/product-detail/api/productDetailApi";
import type { ProductRatingSummary } from "@/features/product-detail/api/productDetailSchemas";

export const productRatingSummaryQueryKey = (productId: string) =>
  ["product-rating-summary", productId] as const;

export const useProductRatingSummary = (productId: string, initialData: ProductRatingSummary) => {
  return useQuery({
    queryKey: productRatingSummaryQueryKey(productId),
    queryFn: async () => {
      const product = await productDetailApi.get(productId);
      const {
        avgRating,
        reviewCount,
        rating1Count,
        rating2Count,
        rating3Count,
        rating4Count,
        rating5Count,
      } = product;
      return {
        avgRating,
        reviewCount,
        rating1Count,
        rating2Count,
        rating3Count,
        rating4Count,
        rating5Count,
      };
    },
    initialData,
    staleTime: Infinity,
  });
};
