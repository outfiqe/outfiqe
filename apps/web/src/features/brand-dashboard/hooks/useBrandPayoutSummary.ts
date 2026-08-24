"use client";

import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/features/auth";

import { brandPayoutApi } from "../api/brandPayoutApi";

export const useBrandPayoutSummary = () => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["brand-payouts", "mine", "summary"],
    queryFn: brandPayoutApi.getMySummary,
    enabled: isAuthenticated,
  });
};
