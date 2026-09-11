"use client";

import { toast } from "@outfiqe/design-system";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { getErrorMessage } from "@/shared/lib/errorMessages";

import { exploreFeedApi } from "../api/exploreFeedApi";
import { cancelFeedPostQueries, patchCreatorInFeedCaches } from "../utils/feedCacheUpdate";
import { FOLLOW_CREATOR_ACTION_TYPE } from "../utils/offlineActionTypes";
import { toggleWithOfflineQueue } from "../utils/offlineQueueableToggle";

export const useFollowCreator = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ creatorId, following }: { creatorId: string; following: boolean }) =>
      toggleWithOfflineQueue(
        FOLLOW_CREATOR_ACTION_TYPE,
        `${FOLLOW_CREATOR_ACTION_TYPE}:${creatorId}`,
        { creatorId, following },
        () => (following ? exploreFeedApi.unfollow(creatorId) : exploreFeedApi.follow(creatorId)),
      ),
    networkMode: "always",

    onMutate: async ({ creatorId, following }) => {
      await cancelFeedPostQueries(queryClient);
      patchCreatorInFeedCaches(queryClient, creatorId, !following);
    },

    onError: (error, { creatorId, following }) => {
      patchCreatorInFeedCaches(queryClient, creatorId, following);
      toast.error(getErrorMessage(error));
    },

    onSuccess: (result, { creatorId }) => {
      if (!result) return;
      patchCreatorInFeedCaches(queryClient, creatorId, result.following);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["suggested-creators"] });
    },
  });
};
