"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import type { ApiClientError } from "@/shared/lib/apiClient";

import { brandDashboardApi } from "../api/brandDashboardApi";
import type { BrandProfile, UpdateBrandProfileInput } from "../api/brandDashboardSchemas";

export const useUpdateBrandProfile = () => {
  const router = useRouter();

  return useMutation<BrandProfile, ApiClientError, UpdateBrandProfileInput>({
    mutationFn: brandDashboardApi.updateMe,
    onSuccess: () => {
      router.refresh();
    },
  });
};
