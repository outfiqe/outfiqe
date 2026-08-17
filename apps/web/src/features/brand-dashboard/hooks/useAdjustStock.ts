"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { ApiClientError } from "@/shared/lib/apiClient";

import { brandProductsApi, type StockAdjustment } from "../api/brandProductsApi";
import type { BrandProductSize } from "../api/brandProductsSchemas";

export const useAdjustStock = () => {
  const queryClient = useQueryClient();

  return useMutation<
    BrandProductSize[],
    ApiClientError,
    { productId: string; adjustments: StockAdjustment[] }
  >({
    mutationFn: ({ productId, adjustments }) =>
      brandProductsApi.adjustStock(productId, adjustments),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brand-products"] });
    },
  });
};
