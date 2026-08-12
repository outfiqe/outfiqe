"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toast } from "@outfiqe/design-system";
import { getErrorMessage } from "@/shared/lib/errorMessages";
import { exploreFeedApi } from "../api/exploreFeedApi";
import { patchPostInFeedCaches } from "./feedCacheUpdate";

export const useLikeLook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ lookId, liked }: { lookId: string; liked: boolean }) =>
      liked ? exploreFeedApi.unlike(lookId) : exploreFeedApi.like(lookId),

    onMutate: ({ lookId, liked }) => {
      patchPostInFeedCaches(queryClient, lookId, (post) => ({
        ...post,
        isLiked: !liked,
        likeCount: post.likeCount + (liked ? -1 : 1),
      }));
    },

    onError: (error, { lookId, liked }) => {
      // Revert the optimistic flip — the request failed, so the prior state still holds.
      patchPostInFeedCaches(queryClient, lookId, (post) => ({
        ...post,
        isLiked: liked,
        likeCount: post.likeCount + (liked ? 1 : -1),
      }));
      toast.error(getErrorMessage(error));
    },
  });
};
