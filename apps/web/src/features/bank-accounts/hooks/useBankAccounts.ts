"use client";

import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/features/auth";

import { bankAccountApi } from "../api/bankAccountApi";
import type { OwnerTypeValue } from "../api/bankAccountSchemas";

export const useBankAccounts = (ownerType: OwnerTypeValue) => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["bank-accounts", ownerType],
    queryFn: () => bankAccountApi.list(ownerType),
    enabled: isAuthenticated,
  });
};
