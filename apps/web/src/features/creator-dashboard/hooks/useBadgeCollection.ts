"use client";

import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/features/auth";

import { badgeApi } from "../api/badgeApi";

export const BADGE_COLLECTION_QUERY_KEY = ["badges", "mine", "collection"];

export const useBadgeCollection = () => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: BADGE_COLLECTION_QUERY_KEY,
    queryFn: badgeApi.getMyCollection,
    enabled: isAuthenticated,
  });
};
