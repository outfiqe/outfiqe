"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import type { ApiClientError } from "@/shared/lib/apiClient";

import { creatorDashboardApi } from "../api/creatorDashboardApi";
import type { CreatorProfile, UpdateCreatorProfileInput } from "../api/creatorDashboardSchemas";

export const useUpdateCreatorProfile = () => {
  const router = useRouter();

  return useMutation<CreatorProfile, ApiClientError, UpdateCreatorProfileInput>({
    mutationFn: creatorDashboardApi.updateMe,
    onSuccess: () => {
      router.refresh();
    },
  });
};
