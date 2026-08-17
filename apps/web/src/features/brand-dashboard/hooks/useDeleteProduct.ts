"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { ApiClientError } from "@/shared/lib/apiClient";

import { brandProductsApi } from "../api/brandProductsApi";

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();

  return useMutation<void, ApiClientError, string>({
    mutationFn: (productId) => brandProductsApi.remove(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brand-products"] });
    },
  });
};
