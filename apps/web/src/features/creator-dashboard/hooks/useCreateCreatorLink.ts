"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { creatorLinksApi } from "../api/creatorLinksApi";
import type { CreatorLink } from "../api/creatorLinksSchemas";

const LINKS_QUERY_KEY = ["creator-links", "mine"];

export const useCreateInternalLink = () => {
  const queryClient = useQueryClient();

  return useMutation<CreatorLink, Error, string>({
    mutationFn: (productId) => creatorLinksApi.createInternal(productId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: LINKS_QUERY_KEY });
    },
  });
};

export const useGetOrCreateExternalLink = () => {
  const queryClient = useQueryClient();

  return useMutation<CreatorLink, Error, string | undefined>({
    mutationFn: (productId) => creatorLinksApi.getOrCreateExternal(productId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: LINKS_QUERY_KEY });
    },
  });
};
