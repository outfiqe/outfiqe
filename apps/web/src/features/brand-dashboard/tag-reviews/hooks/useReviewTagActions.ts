"use client";

import { useApiMutation } from "@outfiqe/hooks";

import type { ApiClientError } from "@/shared/lib/apiClient";

import { tagReviewApi } from "../api/tagReviewApi";
import type { RejectTagInput } from "../api/tagReviewSchemas";
import { TAG_REVIEW_PENDING_COUNT_KEY } from "./useTagReviewPendingCount";
import { TAG_REVIEW_QUEUE_KEY } from "./useTagReviewQueue";

const TAG_REVIEW_INVALIDATE_KEYS = [
  [TAG_REVIEW_QUEUE_KEY],
  [TAG_REVIEW_PENDING_COUNT_KEY],
  ["explore-feed"],
];

export const useReviewTagActions = () => {
  const approve = useApiMutation<void, ApiClientError, { tagId: string; trustCreator: boolean }>({
    mutationFn: ({ tagId, trustCreator }) => tagReviewApi.approve(tagId, trustCreator),
    invalidateKeys: TAG_REVIEW_INVALIDATE_KEYS,
  });

  const reject = useApiMutation<void, ApiClientError, { tagId: string; input: RejectTagInput }>({
    mutationFn: ({ tagId, input }) => tagReviewApi.reject(tagId, input),
    invalidateKeys: TAG_REVIEW_INVALIDATE_KEYS,
  });

  return { approve, reject };
};
