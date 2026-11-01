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

export type CrmTeamMemberSummary = {
  membershipId: string;
  name: string;
  avatarUrl: string | null;
  roleName: string;
  joinedAt: string;
  wonDealCount: number;
  wonValue: number;
  resolvedTicketCount: number;
  completedTaskCount: number;
  activityCount: number;
};

export type CrmPeriodSummary = {
  sales: {
    newDealCount: number;
    wonDealCount: number;
    wonValue: number;
    lostDealCount: number;
  };
  support: {
    openedCount: number;
    resolvedCount: number;
    meanResolutionSeconds: number | null;
  };
  team: CrmTeamMemberSummary[];
};

export type CrmAttentionReport = {
  overdueTaskCount: number;
  tasksDueTodayCount: number;
  unassignedTicketCount: number;
  stuckDealCount: number;
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

export type ContactSearchResult = {
  id: string;
  name: string;
  company: string | null;
  lifecycleStage: string;
};

export type CrmSearchResults = {
  partners: PartnerSummary[];
  customers: CustomerSummary[];
  deals: DealSearchResult[];
  tickets: TicketSearchResult[];
  contacts: ContactSearchResult[];
};

export type ConnectedPerson = {
  userId: string;
  name: string;
  handle: string;
  avatarUrl: string | null;
  role: "partner" | "customer";
};

export type ConnectedTask = {
  id: string;
  title: string;
  dueAt: string;
  assigneeName: string;
};

export type CrmConnections = {
  people: ConnectedPerson[];
  contacts: ContactSearchResult[] | null;
  deals: DealSearchResult[] | null;
  tickets: TicketSearchResult[] | null;
  tasks: ConnectedTask[] | null;
};
