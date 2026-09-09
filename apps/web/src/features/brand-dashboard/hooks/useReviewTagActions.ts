"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { ApiClientError } from "@/shared/lib/apiClient";

import { tagReviewApi } from "../api/tagReviewApi";
import type { RejectTagInput } from "../api/tagReviewSchemas";
import { TAG_REVIEW_PENDING_COUNT_KEY } from "./useTagReviewPendingCount";
import { TAG_REVIEW_QUEUE_KEY } from "./useTagReviewQueue";

export const useReviewTagActions = () => {
  const queryClient = useQueryClient();

  const refreshQueues = () => {
    queryClient.invalidateQueries({ queryKey: [TAG_REVIEW_QUEUE_KEY] });
    queryClient.invalidateQueries({ queryKey: [TAG_REVIEW_PENDING_COUNT_KEY] });
    queryClient.invalidateQueries({ queryKey: ["explore-feed"] });
  };

  const approve = useMutation<void, ApiClientError, { tagId: string; trustCreator: boolean }>({
    mutationFn: ({ tagId, trustCreator }) => tagReviewApi.approve(tagId, trustCreator),
    onSuccess: refreshQueues,
  });

  const reject = useMutation<void, ApiClientError, { tagId: string; input: RejectTagInput }>({
    mutationFn: ({ tagId, input }) => tagReviewApi.reject(tagId, input),
    onSuccess: refreshQueues,
  });

  return { approve, reject };
};
