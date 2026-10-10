"use client";

import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/features/auth";
import { UserRole } from "@/features/auth/types";

import { tagReviewApi } from "../api/tagReviewApi";

export const TAG_REVIEW_PENDING_COUNT_KEY = "brand-tag-reviews-pending-count";

export const useTagReviewPendingCount = () => {
  const { state } = useAuth();
  const isBrandOwner = state.user?.role === UserRole.BRAND_OWNER;

  return useQuery({
    queryKey: [TAG_REVIEW_PENDING_COUNT_KEY],
    queryFn: tagReviewApi.pendingCount,
    enabled: isBrandOwner,
  });
};
