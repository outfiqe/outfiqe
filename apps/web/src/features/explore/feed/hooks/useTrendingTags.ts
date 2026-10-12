"use client";

import { useQuery } from "@tanstack/react-query";

import { exploreFeedApi } from "../api/exploreFeedApi";

export const useTrendingTags = () => {
  return useQuery({
    queryKey: ["trending-tags"],
    queryFn: () => exploreFeedApi.trendingTags(),
  });
};
