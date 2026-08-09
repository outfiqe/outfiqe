"use client";

import { useQuery } from "@tanstack/react-query";

import { creatorLooksApi } from "../api/creatorLooksApi";

export const useTaggableProducts = () => {
  return useQuery({
    queryKey: ["products", "taggable"],
    queryFn: creatorLooksApi.listTaggableProducts,
  });
};
