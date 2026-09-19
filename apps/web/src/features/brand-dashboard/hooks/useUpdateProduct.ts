"use client";

import { useApiMutation } from "@outfiqe/hooks";

import type { ApiClientError } from "@/shared/lib/apiClient";

import { brandProductsApi } from "../api/brandProductsApi";
import type { BrandProduct } from "../api/brandProductsSchemas";
import type { EditProductFormInput } from "../schemas/productForm.schema";

export const useUpdateProduct = () =>
  useApiMutation<BrandProduct, ApiClientError, { productId: string; input: EditProductFormInput }>({
    mutationFn: ({ productId, input }) => brandProductsApi.update(productId, input),
    invalidateKeys: [["brand-products"]],
  });
