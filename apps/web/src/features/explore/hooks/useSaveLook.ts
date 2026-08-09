"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { exploreFeedApi } from "../api/exploreFeedApi";
import { patchPostInFeedCaches } from "./feedCacheUpdate";

export const useSaveLook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ lookId, saved }: { lookId: string; saved: boolean }) =>
      saved ? exploreFeedApi.unsave(lookId) : exploreFeedApi.save(lookId),

    onMutate: ({ lookId, saved }) => {
      patchPostInFeedCaches(queryClient, lookId, (post) => ({
        ...post,
        isSaved: !saved,
        saveCount: post.saveCount + (saved ? -1 : 1),
      }));
    },

    onError: (_err, { lookId, saved }) => {
      patchPostInFeedCaches(queryClient, lookId, (post) => ({
        ...post,
        isSaved: saved,
        saveCount: post.saveCount + (saved ? 1 : -1),
      }));
    },
  });
};
