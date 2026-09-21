"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";

import { useAuth } from "@/features/auth";

import { tagReviewApi } from "../api/tagReviewApi";
import type { TagReviewStatusValue } from "../api/tagReviewSchemas";
import { TAG_REVIEW_QUEUE_TABS } from "../tagReview.constants";
import { TAG_REVIEW_QUEUE_KEY } from "./useTagReviewQueue";

export const usePrefetchTagReviewQueue = () => {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  return useCallback(
    (status: TagReviewStatusValue) => {
      if (!isAuthenticated) return;
      void queryClient.prefetchInfiniteQuery({
        queryKey: [TAG_REVIEW_QUEUE_KEY, status],
        queryFn: ({ pageParam }) => tagReviewApi.listQueue(status, pageParam),
        initialPageParam: undefined as string | undefined,
      });
    },
    [queryClient, isAuthenticated],
  );
};

export const usePrefetchOtherTagReviewQueues = (
  activeStatus: TagReviewStatusValue,
  isActiveQueueLoaded: boolean,
) => {
  const prefetchQueue = usePrefetchTagReviewQueue();

  useEffect(() => {
    if (!isActiveQueueLoaded) return;
    TAG_REVIEW_QUEUE_TABS.forEach(({ status }) => {
      if (status !== activeStatus) prefetchQueue(status);
    });
  }, [activeStatus, isActiveQueueLoaded, prefetchQueue]);
};
