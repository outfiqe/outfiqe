"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { ApiClientError } from "@/shared/lib/apiClient";

import { brandProductsApi } from "../api/brandProductsApi";
import type { BrandProduct } from "../api/brandProductsSchemas";
import type { EditProductFormInput } from "../schemas/productForm.schema";

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation<
    BrandProduct,
    ApiClientError,
    { productId: string; input: EditProductFormInput }
  >({
    mutationFn: ({ productId, input }) => brandProductsApi.update(productId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brand-products"] });
    },
  });
};
