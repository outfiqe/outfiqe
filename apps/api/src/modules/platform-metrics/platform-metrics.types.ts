export type TenantMetricRow = {
  organizationId: string;
  name: string;
  subdomain: string;
  plan: string;
  subscriptionStatus: string | null;
  isPlatformOrg: boolean;
  linkedBrandId: string | null;
  memberCount: number;
  contactCount: number;
  dealCount: number;
  ticketCount: number;
  activityCount: number;
  lastCrmActivityAt: Date | null;
  createdAt: Date;
};

export type TenantMetricListFilters = {
  plan?: string;
  sort?: "recent-activity" | "name" | "created";
  page: number;
  pageSize: number;
};

export type TenantMetricListPage = {
  items: TenantMetricRow[];
  total: number;
  hasMore: boolean;
};

export type PlatformOverview = {
  tenantCount: number;
  tenantsByPlan: { plan: string; count: number }[];
  totalContacts: number;
  totalDeals: number;
  totalTickets: number;
  totalActivities: number;
  totalMembers: number;
};

export type TenantSparklinePoint = {
  day: string;
  contactCount: number;
  dealCount: number;
  ticketCount: number;
  activityCount: number;
  activeMemberCount: number;
};

export type PlatformActivityTrendPoint = {
  date: string;
  activityCount: number;
  dealCount: number;
  ticketCount: number;
  contactCount: number;
};

export type TenantMetricDetail = TenantMetricRow & {
  partnerCount: number;
  customerCount: number;
  series: TenantSparklinePoint[];
};
