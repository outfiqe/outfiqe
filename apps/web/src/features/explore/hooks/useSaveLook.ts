"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toast } from "@outfiqe/design-system";
import { getErrorMessage } from "@/shared/lib/errorMessages";
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

    onError: (error, { lookId, saved }) => {
      patchPostInFeedCaches(queryClient, lookId, (post) => ({
        ...post,
        isSaved: saved,
        saveCount: post.saveCount + (saved ? 1 : -1),
      }));
      toast.error(getErrorMessage(error));
    },
  });
};
