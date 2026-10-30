import type { InsightStatus } from "./insights.constants.js";

export type FunnelStep = { event: string; persons: number };

export type OverviewInsight = {
  visitors: number;
  signups: number;
  buyers: number;
  orders: number;
  visitToBuyerRate: number;
};

export type PurchaseFunnelInsight = {
  steps: FunnelStep[];
  ordersByPaymentMethod: { paymentMethod: string; orders: number }[];
};

export type LookToOrderInsight = {
  steps: FunnelStep[];
  attributedOrders: number;
  topCreatorsByLookViews: {
    creatorId: string;
    creatorName: string | null;
    creatorHandle: string | null;
    lookViews: number;
  }[];
};

export type AcquisitionInsight = {
  sources: { source: string; visitors: number }[];
  campaigns: { campaign: string; visitors: number }[];
  creatorLinkClicks: number;
};

export type RetentionInsight = {
  weeklyActiveVisitors: { weekStart: string; visitors: number }[];
  buyers: number;
  repeatBuyers: number;
  repeatPurchaseRate: number;
};

export type ZeroResultSearchesInsight = {
  searches: { query: string; searchCount: number }[];
};

export type InsightResult<Insight> = {
  status: InsightStatus;
  refreshedAt: string | null;
  posthogUrl: string | null;
  insight: Insight | null;
};

export type CachedInsight<Insight> = { insight: Insight; refreshedAt: string };

export type PosthogQueryConnection = {
  appHost: string;
  projectId: string;
  queryApiKey: string;
};
