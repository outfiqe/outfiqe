"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { useAuth } from "@/features/auth";
import { CreatorStatus } from "@/features/auth/types";
import type { OverviewPeriodDays } from "@/shared/lib/overviewPeriod";

import { creatorOverviewApi } from "../api/creatorOverviewApi";

export const useCreatorOverview = (
  creatorStatus: CreatorStatus,
  periodDays: OverviewPeriodDays,
) => {
  const { isAuthenticated } = useAuth();
  const isApprovedCreator = creatorStatus === CreatorStatus.APPROVED;

  return useQuery({
    queryKey: ["creator-overview", "mine", periodDays],
    queryFn: () => creatorOverviewApi.getMine(periodDays),
    enabled: isAuthenticated && isApprovedCreator,
    placeholderData: keepPreviousData,
  });
};
