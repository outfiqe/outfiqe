"use client";

import { useApiMutation } from "@outfiqe/hooks";

import type { ApiClientError } from "@/shared/lib/apiClient";

import { badgeApi } from "../api/badgeApi";
import { BADGE_COLLECTION_QUERY_KEY } from "./useBadgeCollection";

export const useUpdateBadgeTitle = () =>
  useApiMutation<void, ApiClientError, string | null>({
    mutationFn: (badgeId) => badgeApi.updateTitle(badgeId),
    invalidateKeys: [BADGE_COLLECTION_QUERY_KEY],
  });
