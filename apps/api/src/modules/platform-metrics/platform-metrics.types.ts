export type TenantMetricRow = {
  organizationId: string;
  name: string;
  subdomain: string;
  plan: string;
  subscriptionStatus: string | null;
  isPlatformOrg: boolean;
  linkedBrandId: string | null;
  linkedBrandName: string | null;
  ownerName: string | null;
  memberCount: number;
  contactCount: number;
  dealCount: number;
  ticketCount: number;
  activityCount: number;
  lastCrmActivityAt: Date | null;
  createdAt: Date;
};

export type TenantSort =
  | "recent-activity"
  | "name"
  | "created"
  | "members"
  | "contacts"
  | "deals"
  | "tickets"
  | "activities";

export type TenantMetricListFilters = {
  plan?: string;
  search?: string;
  sort?: TenantSort;
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

export type TenantAccount = {
  ownerEmail: string | null;
  trialEndsAt: Date | null;
  seats: number | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  pendingInviteCount: number;
};

export type TenantMetricDetail = TenantMetricRow &
  TenantAccount & {
    partnerCount: number;
    customerCount: number;
    activeMemberCount: number;
    series: TenantSparklinePoint[];
  };

export type PlatformAttentionCounts = {
  ordersToPack: number;
  productsToReview: number;
  brandApplications: number;
  refundsWaiting: number;
  withdrawalRequests: number;
  supportRequests: number;
};
