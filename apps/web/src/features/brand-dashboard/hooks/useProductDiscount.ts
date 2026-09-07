"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { ApiClientError } from "@/shared/lib/apiClient";

import type { SetProductDiscountInput, UpdateProductDiscountInput } from "../api/brandProductsApi";
import { brandProductsApi } from "../api/brandProductsApi";
import type { ProductDiscount } from "../api/brandProductsSchemas";

export const useSetProductDiscount = () => {
  const queryClient = useQueryClient();

  return useMutation<
    ProductDiscount,
    ApiClientError,
    { productId: string; input: SetProductDiscountInput }
  >({
    mutationFn: ({ productId, input }) => brandProductsApi.setDiscount(productId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["brand-products"] }),
  });
};

export const useUpdateProductDiscount = () => {
  const queryClient = useQueryClient();

  return useMutation<
    ProductDiscount,
    ApiClientError,
    { productId: string; input: UpdateProductDiscountInput }
  >({
    mutationFn: ({ productId, input }) => brandProductsApi.updateDiscount(productId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["brand-products"] }),
  });
};

export const useRemoveProductDiscount = () => {
  const queryClient = useQueryClient();

  return useMutation<void, ApiClientError, string>({
    mutationFn: (productId) => brandProductsApi.removeDiscount(productId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["brand-products"] }),
  });
};
