"use client";

import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/features/auth";

import { brandOverviewApi } from "../api/brandOverviewApi";

export const useBrandOverview = () => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["brand-overview", "mine"],
    queryFn: brandOverviewApi.getMine,
    enabled: isAuthenticated,
  });
};
