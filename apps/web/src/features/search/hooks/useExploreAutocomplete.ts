"use client";

import { useQuery } from "@tanstack/react-query";

import { exploreSearchApi } from "../api/exploreSearchApi";

const AUTOCOMPLETE_STALE_TIME_MS = 60_000;

export const useExploreAutocomplete = (q: string, enabled: boolean) => {
  const creators = useQuery({
    queryKey: ["creator-autocomplete", q],
    queryFn: () => exploreSearchApi.autocompleteCreators(q),
    enabled,
    staleTime: AUTOCOMPLETE_STALE_TIME_MS,
    placeholderData: (previous) => previous,
  });

  const posts = useQuery({
    queryKey: ["post-autocomplete", q],
    queryFn: () => exploreSearchApi.autocompletePosts(q),
    enabled,
    staleTime: AUTOCOMPLETE_STALE_TIME_MS,
    placeholderData: (previous) => previous,
  });

  return {
    creators: creators.data,
    posts: posts.data,
    isLoading: creators.isLoading || posts.isLoading,
  };
};
