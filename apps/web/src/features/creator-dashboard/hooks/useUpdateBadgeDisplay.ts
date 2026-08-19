"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { ApiClientError } from "@/shared/lib/apiClient";

import { badgeApi } from "../api/badgeApi";
import { BADGE_COLLECTION_QUERY_KEY } from "./useBadgeCollection";

export const useUpdateBadgeDisplay = () => {
  const queryClient = useQueryClient();

  return useMutation<void, ApiClientError, { badgeId: string; isDisplayed: boolean }>({
    mutationFn: ({ badgeId, isDisplayed }) => badgeApi.updateDisplay(badgeId, isDisplayed),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BADGE_COLLECTION_QUERY_KEY });
    },
  });
};
