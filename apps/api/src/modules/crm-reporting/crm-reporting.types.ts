import type {
  CustomerSummary,
  PartnerSummary,
} from "#modules/crm-relationships/crm-relationships.types.js";

export type PipelineStageReportRow = {
  stageId: string;
  stageName: string;
  sortOrder: number;
  isWon: boolean;
  isLost: boolean;
  openDealCount: number;
  openValue: number;
  wonDealCount: number;
  wonValue: number;
  lostDealCount: number;
};

export type PipelineReport = {
  stages: PipelineStageReportRow[];
  totals: {
    openDealCount: number;
    openValue: number;
    wonDealCount: number;
    wonValue: number;
    lostDealCount: number;
  };
};

export type TicketStatusCountRow = {
  status: string;
  count: number;
};

export type TicketReport = {
  statusCounts: TicketStatusCountRow[];
  openCount: number;
  resolvedCount: number;
  meanResolutionSeconds: number | null;
};

export type CrmActivityTrendPoint = {
  date: string;
  count: number;
};

export type CrmOverviewReport = {
  pipeline: PipelineReport;
  tickets: TicketReport;
  openTasksDueTodayCount: number;
  activityTrend: CrmActivityTrendPoint[];
};

export type DealSearchResult = {
  id: string;
  title: string;
  value: number;
  status: string;
  stageName: string;
};

export type TicketSearchResult = {
  id: string;
  title: string;
  type: string;
  status: string;
};

export type CrmSearchResults = {
  partners: PartnerSummary[];
  customers: CustomerSummary[];
  deals: DealSearchResult[];
  tickets: TicketSearchResult[];
};
