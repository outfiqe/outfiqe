export const DEFAULT_OVERVIEW_PERIOD_DAYS = 30;
export const OVERVIEW_PERIOD_OPTIONS = [7, DEFAULT_OVERVIEW_PERIOD_DAYS, 90] as const;
export type OverviewPeriodDays = (typeof OVERVIEW_PERIOD_OPTIONS)[number];

export const OVERVIEW_RANGE_SEARCH_PARAM = "range";

const OVERVIEW_RANGE_DAYS_SUFFIX = "d";

export const toOverviewRange = (days: OverviewPeriodDays): string =>
  `${days}${OVERVIEW_RANGE_DAYS_SUFFIX}`;

export const OVERVIEW_RANGES = OVERVIEW_PERIOD_OPTIONS.map(toOverviewRange);

export const toOverviewPeriodDays = (
  range: string | string[] | null | undefined,
): OverviewPeriodDays =>
  OVERVIEW_PERIOD_OPTIONS.find((days) => toOverviewRange(days) === range) ??
  DEFAULT_OVERVIEW_PERIOD_DAYS;
