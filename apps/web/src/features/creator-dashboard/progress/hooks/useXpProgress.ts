"use client";

import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/features/auth";

import { xpApi } from "../api/xpApi";

export const useXpProgress = () => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["xp", "mine", "progress"],
    queryFn: xpApi.getMyProgress,
    enabled: isAuthenticated,
  });
};
