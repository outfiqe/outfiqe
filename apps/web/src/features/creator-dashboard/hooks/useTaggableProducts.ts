"use client";

import { useQuery } from "@tanstack/react-query";

import { creatorLooksApi } from "../api/creatorLooksApi";

export const useTaggableProducts = (q?: string) => {
  return useQuery({
    queryKey: ["products", "taggable", q ?? ""],
    queryFn: () => creatorLooksApi.listTaggableProducts(q),
    placeholderData: (previous) => previous,
  });
};
