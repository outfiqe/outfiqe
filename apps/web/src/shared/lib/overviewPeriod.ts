export const DEFAULT_OVERVIEW_PERIOD_DAYS = 30;
export const OVERVIEW_PERIOD_OPTIONS = [7, DEFAULT_OVERVIEW_PERIOD_DAYS, 90] as const;
export type OverviewPeriodDays = (typeof OVERVIEW_PERIOD_OPTIONS)[number];
