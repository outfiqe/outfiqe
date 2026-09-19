"use client";

import { useApiMutation } from "@outfiqe/hooks";

import type { ApiClientError } from "@/shared/lib/apiClient";

import type { SetProductDiscountInput, UpdateProductDiscountInput } from "../api/brandProductsApi";
import { brandProductsApi } from "../api/brandProductsApi";
import type { ProductDiscount } from "../api/brandProductsSchemas";

const BRAND_PRODUCTS_INVALIDATE_KEYS = [["brand-products"]];

export const useSetProductDiscount = () =>
  useApiMutation<
    ProductDiscount,
    ApiClientError,
    { productId: string; input: SetProductDiscountInput }
  >({
    mutationFn: ({ productId, input }) => brandProductsApi.setDiscount(productId, input),
    invalidateKeys: BRAND_PRODUCTS_INVALIDATE_KEYS,
  });

export const useUpdateProductDiscount = () =>
  useApiMutation<
    ProductDiscount,
    ApiClientError,
    { productId: string; input: UpdateProductDiscountInput }
  >({
    mutationFn: ({ productId, input }) => brandProductsApi.updateDiscount(productId, input),
    invalidateKeys: BRAND_PRODUCTS_INVALIDATE_KEYS,
  });

export const useRemoveProductDiscount = () =>
  useApiMutation<void, ApiClientError, string>({
    mutationFn: (productId) => brandProductsApi.removeDiscount(productId),
    invalidateKeys: BRAND_PRODUCTS_INVALIDATE_KEYS,
  });
