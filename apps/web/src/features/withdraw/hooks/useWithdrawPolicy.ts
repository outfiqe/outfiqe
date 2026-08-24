"use client";

import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/features/auth";

import { withdrawApi } from "../api/withdrawApi";
import type { OwnerTypeValue } from "../api/withdrawSchemas";

export const useWithdrawPolicy = (ownerType: OwnerTypeValue) => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["withdraw", "policy", ownerType],
    queryFn: () => withdrawApi.getPolicy(ownerType),
    enabled: isAuthenticated,
  });
};
