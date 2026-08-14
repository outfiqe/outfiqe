"use client";

import { useMutation } from "@tanstack/react-query";

import type { ApiClientError } from "@/shared/lib/apiClient";

import { brandDashboardApi } from "../api/brandDashboardApi";
import type { BrandProfile, UpdateBrandProfileInput } from "../api/brandDashboardSchemas";

export const useUpdateBrandProfile = () => {
  return useMutation<BrandProfile, ApiClientError, UpdateBrandProfileInput>({
    mutationFn: brandDashboardApi.updateMe,
  });
};
