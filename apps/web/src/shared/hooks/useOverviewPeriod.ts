"use client";

import {
  DEFAULT_OVERVIEW_PERIOD_DAYS,
  OVERVIEW_RANGE_SEARCH_PARAM,
  OVERVIEW_RANGES,
  type OverviewPeriodDays,
  toOverviewPeriodDays,
  toOverviewRange,
} from "@/shared/lib/overviewPeriod";

import { useTabSearchParam } from "./useTabSearchParam";

export const useOverviewPeriod = () => {
  const { selectedTab: selectedRange, selectTab: selectRange } = useTabSearchParam(
    OVERVIEW_RANGES,
    toOverviewRange(DEFAULT_OVERVIEW_PERIOD_DAYS),
    OVERVIEW_RANGE_SEARCH_PARAM,
  );

  return {
    periodDays: toOverviewPeriodDays(selectedRange),
    selectPeriodDays: (days: OverviewPeriodDays) => selectRange(toOverviewRange(days)),
  };
};
