"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { creatorLinksApi } from "../api/creatorLinksApi";
import { removeCreatorLinkFromCache } from "../utils/creatorLinksCacheUpdate";

export const useDeleteCreatorLink = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (linkId) => creatorLinksApi.remove(linkId),
    onSuccess: (_result, linkId) => removeCreatorLinkFromCache(queryClient, linkId),
  });
};
