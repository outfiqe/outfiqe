"use client";

import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/features/auth";

import { addressApi } from "../api/addressApi";

export const ADDRESSES_QUERY_KEY = ["addresses"] as const;

export const useAddresses = () => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ADDRESSES_QUERY_KEY,
    queryFn: () => addressApi.list(),
    enabled: isAuthenticated,
  });
};
