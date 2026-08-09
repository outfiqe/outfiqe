"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { exploreFeedApi } from "../api/exploreFeedApi";
import { patchCreatorInFeedCaches } from "./feedCacheUpdate";

export const useFollowCreator = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ creatorId, following }: { creatorId: string; following: boolean }) =>
      following ? exploreFeedApi.unfollow(creatorId) : exploreFeedApi.follow(creatorId),

    onMutate: ({ creatorId, following }) => {
      patchCreatorInFeedCaches(queryClient, creatorId, !following);
    },

    onError: (_err, { creatorId, following }) => {
      patchCreatorInFeedCaches(queryClient, creatorId, following);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["suggested-creators"] });
    },
  });
};
