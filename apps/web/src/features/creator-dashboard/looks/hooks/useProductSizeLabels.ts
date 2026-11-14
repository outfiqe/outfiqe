"use client";

import { useQuery } from "@tanstack/react-query";

import { productDetailApi } from "@/features/product-detail/api/productDetailApi";

const SIZE_LABELS_STALE_TIME_MS = 5 * 60 * 1000;

export const useProductSizeLabels = (productId: string) => {
  const productQuery = useQuery({
    queryKey: ["product-detail", productId],
    queryFn: () => productDetailApi.get(productId),
    staleTime: SIZE_LABELS_STALE_TIME_MS,
  });
  const sizeLabels = productQuery.data?.sizes.map(({ label }) => label) ?? [];
  return { sizeLabels, isLoading: productQuery.isLoading };
};
