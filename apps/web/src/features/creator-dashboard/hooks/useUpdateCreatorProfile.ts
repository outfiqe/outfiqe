"use client";

import { useMutation } from "@tanstack/react-query";

import type { ApiClientError } from "@/shared/lib/apiClient";

import { creatorDashboardApi } from "../api/creatorDashboardApi";
import type { CreatorProfile, UpdateCreatorProfileInput } from "../api/creatorDashboardSchemas";

export const useUpdateCreatorProfile = () => {
  return useMutation<CreatorProfile, ApiClientError, UpdateCreatorProfileInput>({
    mutationFn: creatorDashboardApi.updateMe,
  });
};
