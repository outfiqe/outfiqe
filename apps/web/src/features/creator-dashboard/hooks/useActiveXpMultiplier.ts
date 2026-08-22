"use client";

import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/features/auth";

import { xpApi } from "../api/xpApi";

const REFETCH_INTERVAL_MS = 60 * 1000;

export const useActiveXpMultiplier = () => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["xp", "multiplier", "active"],
    queryFn: xpApi.getActiveMultiplier,
    enabled: isAuthenticated,
    refetchInterval: REFETCH_INTERVAL_MS,
  });
};
