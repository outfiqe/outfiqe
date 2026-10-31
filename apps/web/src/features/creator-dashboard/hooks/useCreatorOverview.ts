"use client";

import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/features/auth";
import { CreatorStatus } from "@/features/auth/types";

import { creatorOverviewApi } from "../api/creatorOverviewApi";

export const useCreatorOverview = (creatorStatus: CreatorStatus) => {
  const { isAuthenticated } = useAuth();
  const isApprovedCreator = creatorStatus === CreatorStatus.APPROVED;

  return useQuery({
    queryKey: ["creator-overview", "mine"],
    queryFn: creatorOverviewApi.getMine,
    enabled: isAuthenticated && isApprovedCreator,
  });
};
