"use client";

import type { InfiniteData } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { creatorLinksApi } from "../api/creatorLinksApi";
import type { CreatorLink, CreatorLinkPage } from "../api/creatorLinksSchemas";

const LINKS_QUERY_KEY = ["creator-links", "mine"];

const prependLinkToCache = (queryClient: ReturnType<typeof useQueryClient>, link: CreatorLink) => {
  queryClient.setQueriesData<InfiniteData<CreatorLinkPage, string | undefined>>(
    { queryKey: LINKS_QUERY_KEY },
    (data) => {
      if (!data) return data;

      const [firstPage, ...restPages] = data.pages;
      if (!firstPage || firstPage.items.some((item) => item.id === link.id)) return data;

      return {
        ...data,
        pages: [{ ...firstPage, items: [link, ...firstPage.items] }, ...restPages],
      };
    },
  );
};

export const useCreateInternalLink = () => {
  const queryClient = useQueryClient();

  return useMutation<CreatorLink, Error, string>({
    mutationFn: (productId) => creatorLinksApi.createInternal(productId),
    onSuccess: (link) => prependLinkToCache(queryClient, link),
  });
};

export const useGetOrCreateExternalLink = () => {
  const queryClient = useQueryClient();

  return useMutation<CreatorLink, Error, string | undefined>({
    mutationFn: (productId) => creatorLinksApi.getOrCreateExternal(productId),
    onSuccess: (link) => prependLinkToCache(queryClient, link),
  });
};
