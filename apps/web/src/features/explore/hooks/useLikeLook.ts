"use client";

import { toast } from "@outfiqe/design-system";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { getErrorMessage } from "@/shared/lib/errorMessages";

import { exploreFeedApi } from "../api/exploreFeedApi";
import { patchPostInFeedCaches } from "../utils/feedCacheUpdate";
import { LIKE_LOOK_ACTION_TYPE } from "../utils/offlineActionTypes";
import { toggleWithOfflineQueue } from "../utils/offlineQueueableToggle";

export const useLikeLook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ lookId, liked }: { lookId: string; liked: boolean }) =>
      toggleWithOfflineQueue(
        LIKE_LOOK_ACTION_TYPE,
        `${LIKE_LOOK_ACTION_TYPE}:${lookId}`,
        {
          lookId,
          liked,
        },
        () => (liked ? exploreFeedApi.unlike(lookId) : exploreFeedApi.like(lookId)),
      ),
    networkMode: "always",

    onMutate: async ({ lookId, liked }) => {
      await queryClient.cancelQueries({ queryKey: ["explore-feed"] });

      patchPostInFeedCaches(queryClient, lookId, (post) => ({
        ...post,
        isLiked: !liked,
        likeCount: post.likeCount + (liked ? -1 : 1),
      }));
    },

    onError: (error, { lookId, liked }) => {
      patchPostInFeedCaches(queryClient, lookId, (post) => ({
        ...post,
        isLiked: liked,
        likeCount: post.likeCount + (liked ? 1 : -1),
      }));
      toast.error(getErrorMessage(error));
    },

    onSuccess: (result, { lookId }) => {
      if (!result) return;
      const { liked, likeCount } = result;
      patchPostInFeedCaches(queryClient, lookId, (post) => ({
        ...post,
        isLiked: liked,
        likeCount,
      }));
    },
  });
};
