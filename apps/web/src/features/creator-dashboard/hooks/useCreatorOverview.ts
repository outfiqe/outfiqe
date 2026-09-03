"use client";

import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/features/auth";

import { creatorOverviewApi } from "../api/creatorOverviewApi";

export const useCreatorOverview = () => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["creator-overview", "mine"],
    queryFn: creatorOverviewApi.getMine,
    enabled: isAuthenticated,
  });
};
