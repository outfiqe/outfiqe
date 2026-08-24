"use client";

import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/features/auth";

import { nepalBankApi } from "../api/nepalBankApi";

export const useNepalBanks = () => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["nepal-banks"],
    queryFn: nepalBankApi.list,
    enabled: isAuthenticated,
  });
};
