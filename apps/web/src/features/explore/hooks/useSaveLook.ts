"use client";

import { toast } from "@outfiqe/design-system";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { getErrorMessage } from "@/shared/lib/errorMessages";

import { exploreFeedApi } from "../api/exploreFeedApi";
import { patchPostInFeedCaches } from "../utils/feedCacheUpdate";
import { SAVE_LOOK_ACTION_TYPE } from "../utils/offlineActionTypes";
import { toggleWithOfflineQueue } from "../utils/offlineQueueableToggle";

export const useSaveLook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ lookId, saved }: { lookId: string; saved: boolean }) =>
      toggleWithOfflineQueue(
        SAVE_LOOK_ACTION_TYPE,
        `${SAVE_LOOK_ACTION_TYPE}:${lookId}`,
        { lookId, saved },
        () => (saved ? exploreFeedApi.unsave(lookId) : exploreFeedApi.save(lookId)),
      ),
    networkMode: "always",

    onMutate: async ({ lookId, saved }) => {
      await queryClient.cancelQueries({ queryKey: ["explore-feed"] });

      patchPostInFeedCaches(queryClient, lookId, (post) => ({
        ...post,
        isSaved: !saved,
        saveCount: post.saveCount + (saved ? -1 : 1),
      }));
    },

    onError: (error, { lookId, saved }) => {
      patchPostInFeedCaches(queryClient, lookId, (post) => ({
        ...post,
        isSaved: saved,
        saveCount: post.saveCount + (saved ? 1 : -1),
      }));
      toast.error(getErrorMessage(error));
    },

    onSuccess: (result, { lookId }) => {
      if (!result) return;
      const { saved, saveCount } = result;
      patchPostInFeedCaches(queryClient, lookId, (post) => ({
        ...post,
        isSaved: saved,
        saveCount,
      }));
    },
  });
};
