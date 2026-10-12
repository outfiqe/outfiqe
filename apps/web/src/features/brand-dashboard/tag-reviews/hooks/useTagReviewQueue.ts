"use client";

import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { useAuth } from "@/features/auth";

import { tagReviewApi } from "../api/tagReviewApi";
import type { TagReviewStatusValue } from "../api/tagReviewSchemas";

export const TAG_REVIEW_QUEUE_KEY = "brand-tag-reviews";

export const useTagReviewQueue = (status: TagReviewStatusValue) => {
  const { isAuthenticated } = useAuth();

  return useInfiniteCursorPage(
    [TAG_REVIEW_QUEUE_KEY, status],
    (cursor) => tagReviewApi.listQueue(status, cursor),
    isAuthenticated,
  );
};
