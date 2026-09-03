import type { CreatorCommissionView } from "#modules/commissions/commission.types.js";

export type CreatorOverviewKpis = {
  totalEarnings: number;
  pendingEarnings: number;
  availableEarnings: number;
  last30DaysEarnings: number;
  previous30DaysEarnings: number;
  lookCount: number;
  followerCount: number;
  totalLikes: number;
};

export type CreatorOverviewTrendPoint = {
  date: string;
  earnings: number;
  cumulativeEarnings: number;
  looks: number;
};

export type CreatorOverview = {
  kpis: CreatorOverviewKpis;
  trend: CreatorOverviewTrendPoint[];
  recentCommissions: CreatorCommissionView[];
};

export type EarningsWindowRow = {
  last30: number;
  previous30: number;
};

export type LookAggregates = {
  lookCount: number;
  totalLikes: number;
};
