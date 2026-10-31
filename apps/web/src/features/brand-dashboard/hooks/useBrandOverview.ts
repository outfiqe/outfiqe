"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { useAuth } from "@/features/auth";
import type { OverviewPeriodDays } from "@/shared/lib/overviewPeriod";

import { brandOverviewApi } from "../api/brandOverviewApi";

export const useBrandOverview = (periodDays: OverviewPeriodDays) => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["brand-overview", "mine", periodDays],
    queryFn: () => brandOverviewApi.getMine(periodDays),
    enabled: isAuthenticated,
    placeholderData: keepPreviousData,
  });
};
