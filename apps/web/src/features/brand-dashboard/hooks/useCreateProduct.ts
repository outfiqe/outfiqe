"use client";

import { useApiMutation } from "@outfiqe/hooks";

import type { ApiClientError } from "@/shared/lib/apiClient";

import { brandProductsApi } from "../api/brandProductsApi";
import type { BrandProduct } from "../api/brandProductsSchemas";
import type { ProductFormInput } from "../schemas/productForm.schema";

export const useCreateProduct = () =>
  useApiMutation<BrandProduct, ApiClientError, ProductFormInput>({
    mutationFn: brandProductsApi.create,
    invalidateKeys: [["brand-products"]],
  });
