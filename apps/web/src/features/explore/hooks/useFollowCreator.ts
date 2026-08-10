"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toast } from "@/design-system/components/ui/toast";
import { getErrorMessage } from "@/shared/lib/errorMessages";
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

    onError: (error, { creatorId, following }) => {
      patchCreatorInFeedCaches(queryClient, creatorId, following);
      toast.error(getErrorMessage(error));
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["suggested-creators"] });
    },
  });
};
