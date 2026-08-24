"use client";

import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/features/auth";

import { withdrawApi } from "../api/withdrawApi";
import type { OwnerTypeValue } from "../api/withdrawSchemas";

export const useWithdrawEligibility = (ownerType: OwnerTypeValue) => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["withdraw", "eligibility", ownerType],
    queryFn: () => withdrawApi.getEligibility(ownerType),
    enabled: isAuthenticated,
  });
};
