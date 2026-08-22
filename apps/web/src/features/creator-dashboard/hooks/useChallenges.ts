"use client";

import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/features/auth";

import { challengeApi } from "../api/challengeApi";

export const CHALLENGES_QUERY_KEY = ["challenges", "active"];

export const useChallenges = () => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: CHALLENGES_QUERY_KEY,
    queryFn: challengeApi.listActive,
    enabled: isAuthenticated,
  });
};
