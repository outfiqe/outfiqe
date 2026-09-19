"use client";

import { useApiMutation } from "@outfiqe/hooks";

import type { ApiClientError } from "@/shared/lib/apiClient";

import { brandProductsApi, type StockAdjustment } from "../api/brandProductsApi";
import type { BrandProductSize } from "../api/brandProductsSchemas";

export const useAdjustStock = () =>
  useApiMutation<
    BrandProductSize[],
    ApiClientError,
    { productId: string; adjustments: StockAdjustment[] }
  >({
    mutationFn: ({ productId, adjustments }) =>
      brandProductsApi.adjustStock(productId, adjustments),
    invalidateKeys: [["brand-products"]],
  });
