"use client";

import { useApiMutation } from "@outfiqe/hooks";

import type { ApiClientError } from "@/shared/lib/apiClient";

import type { SizeChartPayload } from "../api/brandProductsApi";
import { brandProductsApi } from "../api/brandProductsApi";
import type { BrandProduct } from "../api/brandProductsSchemas";
import type { UpdateProductPayload } from "../schemas/productForm.schema";

export const useUpdateProduct = () =>
  useApiMutation<BrandProduct, ApiClientError, { productId: string; input: UpdateProductPayload }>({
    mutationFn: ({ productId, input }) => brandProductsApi.update(productId, input),
    invalidateKeys: [["brand-products"]],
  });

export const useUpdateSizeChart = () =>
  useApiMutation<BrandProduct, ApiClientError, { productId: string; sizeChart: SizeChartPayload }>({
    mutationFn: ({ productId, sizeChart }) =>
      brandProductsApi.updateSizeChart(productId, sizeChart),
    invalidateKeys: [["brand-products"]],
  });
