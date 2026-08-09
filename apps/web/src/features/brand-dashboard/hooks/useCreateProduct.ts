"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { ApiClientError } from "@/shared/lib/apiClient";
import { brandProductsApi } from "../api/brandProductsApi";
import type { BrandProduct } from "../api/brandProductsSchemas";
import type { ProductFormInput } from "../schemas/productForm.schema";

export const useCreateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation<BrandProduct, ApiClientError, ProductFormInput>({
    mutationFn: brandProductsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brand-products"] });
    },
  });
};
