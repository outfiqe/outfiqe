"use client";

import { useApiMutation } from "@outfiqe/hooks";

import type { ApiClientError } from "@/shared/lib/apiClient";

import { badgeApi } from "../api/badgeApi";
import { BADGE_COLLECTION_QUERY_KEY } from "./useBadgeCollection";

export const useUpdateFeaturedBadges = () =>
  useApiMutation<void, ApiClientError, string[]>({
    mutationFn: (badgeIds) => badgeApi.updateFeatured(badgeIds),
    invalidateKeys: [BADGE_COLLECTION_QUERY_KEY],
  });
