import type { CommissionSource } from "#generated/prisma/enums.js";
import type { CreatorCommissionView } from "#modules/commissions/commission.types.js";

export type CreatorOverviewKpis = {
  totalEarnings: number;
  pendingEarnings: number;
  availableEarnings: number;
  periodDays: number;
  periodEarnings: number;
  previousPeriodEarnings: number;
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

export type CreatorTopLook = {
  id: string;
  imageUrl: string;
  caption: string | null;
  likeCount: number;
  salesCount: number;
  earnings: number;
};

export type CreatorEarningsBySource = {
  source: CommissionSource;
  earnings: number;
  salesCount: number;
};

export type CreatorOverview = {
  kpis: CreatorOverviewKpis;
  trend: CreatorOverviewTrendPoint[];
  handle: string;
  nextAvailableAt: Date | null;
  topLooks: CreatorTopLook[];
  earningsBySource: CreatorEarningsBySource[];
  recentCommissions: CreatorCommissionView[];
};

export type EarningsWindowRow = {
  period: number;
  previousPeriod: number;
};

export type LookAggregates = {
  lookCount: number;
  totalLikes: number;
};
