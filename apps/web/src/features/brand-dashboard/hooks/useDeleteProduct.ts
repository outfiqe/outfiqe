"use client";

import { useApiMutation } from "@outfiqe/hooks";

import type { ApiClientError } from "@/shared/lib/apiClient";

import { brandProductsApi } from "../api/brandProductsApi";

export const useDeleteProduct = () =>
  useApiMutation<void, ApiClientError, string>({
    mutationFn: (productId) => brandProductsApi.remove(productId),
    invalidateKeys: [["brand-products"]],
  });
