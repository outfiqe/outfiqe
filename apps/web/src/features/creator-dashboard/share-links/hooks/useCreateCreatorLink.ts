"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { creatorLinksApi } from "../api/creatorLinksApi";
import type { CreatorLink } from "../api/creatorLinksSchemas";
import { prependCreatorLinkToCache } from "../utils/creatorLinksCacheUpdate";

export const useCreateInternalLink = () => {
  const queryClient = useQueryClient();

  return useMutation<CreatorLink, Error, string>({
    mutationFn: (productId) => creatorLinksApi.createInternal(productId),
    onSuccess: (link) => prependCreatorLinkToCache(queryClient, link),
  });
};

export const useGetOrCreateExternalLink = () => {
  const queryClient = useQueryClient();

  return useMutation<CreatorLink, Error, string | undefined>({
    mutationFn: (productId) => creatorLinksApi.getOrCreateExternal(productId),
    onSuccess: (link) => prependCreatorLinkToCache(queryClient, link),
  });
};
