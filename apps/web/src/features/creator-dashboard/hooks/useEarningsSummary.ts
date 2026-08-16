"use client";

import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/features/auth";

import { commissionApi } from "../api/commissionApi";

export const useEarningsSummary = () => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["commissions", "mine", "summary"],
    queryFn: commissionApi.getMySummary,
    enabled: isAuthenticated,
  });
};
