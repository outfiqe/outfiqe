"use client";

import { useApiMutation } from "@outfiqe/hooks";

import type { ApiClientError } from "@/shared/lib/apiClient";

import { brandReturnApi } from "../api/brandReturnApi";
import type { BrandReturn } from "../api/brandReturnSchemas";
import { BRAND_RETURNS_QUERY_KEY } from "../constants/brandReturnLabels";

export const useConfirmBrandReturn = () =>
  useApiMutation<BrandReturn, ApiClientError, string>({
    mutationFn: (brandReturnId) => brandReturnApi.confirm(brandReturnId),
    invalidateKeys: [BRAND_RETURNS_QUERY_KEY],
    successMessage: "Thanks. Items in good condition are back in your stock.",
  });
