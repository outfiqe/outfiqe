"use client";

import { useMutation } from "@tanstack/react-query";

import type { ApiClientError } from "@/shared/lib/apiClient";
import { brandApplicationApi } from "../api/brandApplicationApi";
import type { BrandApplicationInput } from "../schemas/brandApplication.schema";

export function useSubmitBrandApplication() {
  return useMutation<void, ApiClientError, BrandApplicationInput>({
    mutationFn: brandApplicationApi.submit,
  });
}
