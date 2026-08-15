"use client";

import { toast } from "@outfiqe/design-system";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { getErrorMessage } from "@/shared/lib/errorMessages";

import { exploreFeedApi } from "../api/exploreFeedApi";
import { patchPostInFeedCaches } from "../utils/feedCacheUpdate";

export const useLikeLook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ lookId, liked }: { lookId: string; liked: boolean }) =>
      liked ? exploreFeedApi.unlike(lookId) : exploreFeedApi.like(lookId),

    onMutate: async ({ lookId, liked }) => {
      await queryClient.cancelQueries({ queryKey: ["explore-feed"] });

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

    onSuccess: ({ liked, likeCount }, { lookId }) => {
      patchPostInFeedCaches(queryClient, lookId, (post) => ({
        ...post,
        isLiked: liked,
        likeCount,
      }));
    },
  });
};
