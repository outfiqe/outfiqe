import { z } from "zod";

export const tenantMetricRowSchema = z.object({
  organizationId: z.string(),
  name: z.string(),
  subdomain: z.string(),
  plan: z.string(),
  subscriptionStatus: z.string().nullable(),
  isPlatformOrg: z.boolean(),
  linkedBrandId: z.string().nullable(),
  linkedBrandName: z.string().nullable(),
  ownerName: z.string().nullable(),
  memberCount: z.number(),
  contactCount: z.number(),
  dealCount: z.number(),
  ticketCount: z.number(),
  activityCount: z.number(),
  lastCrmActivityAt: z.string().nullable(),
  createdAt: z.string(),
});
export type TenantMetricRow = z.infer<typeof tenantMetricRowSchema>;

export const tenantMetricListPageSchema = z.object({
  items: z.array(tenantMetricRowSchema),
  total: z.number(),
  hasMore: z.boolean(),
});
export type TenantMetricListPage = z.infer<typeof tenantMetricListPageSchema>;

export const platformOverviewSchema = z.object({
  tenantCount: z.number(),
  tenantsByPlan: z.array(z.object({ plan: z.string(), count: z.number() })),
  totalContacts: z.number(),
  totalDeals: z.number(),
  totalTickets: z.number(),
  totalActivities: z.number(),
  totalMembers: z.number(),
});
export type PlatformOverview = z.infer<typeof platformOverviewSchema>;

export const platformAttentionCountsSchema = z.object({
  ordersToPack: z.number(),
  productsToReview: z.number(),
  brandApplications: z.number(),
  refundsWaiting: z.number(),
  withdrawalRequests: z.number(),
  supportRequests: z.number(),
});
export type PlatformAttentionCounts = z.infer<typeof platformAttentionCountsSchema>;

export const tenantSparklinePointSchema = z.object({
  day: z.string(),
  contactCount: z.number(),
  dealCount: z.number(),
  ticketCount: z.number(),
  activityCount: z.number(),
  activeMemberCount: z.number(),
});
export type TenantSparklinePoint = z.infer<typeof tenantSparklinePointSchema>;

export const platformActivityTrendPointSchema = z.object({
  date: z.string(),
  activityCount: z.number(),
  dealCount: z.number(),
  ticketCount: z.number(),
  contactCount: z.number(),
});
export type PlatformActivityTrendPoint = z.infer<typeof platformActivityTrendPointSchema>;

export const platformActivityTrendSchema = z.array(platformActivityTrendPointSchema);

export const tenantMetricDetailSchema = tenantMetricRowSchema.extend({
  ownerEmail: z.string().nullable(),
  trialEndsAt: z.string().nullable(),
  seats: z.number().nullable(),
  currentPeriodEnd: z.string().nullable(),
  cancelAtPeriodEnd: z.boolean(),
  pendingInviteCount: z.number(),
  partnerCount: z.number(),
  customerCount: z.number(),
  activeMemberCount: z.number(),
  series: z.array(tenantSparklinePointSchema),
});
export type TenantMetricDetail = z.infer<typeof tenantMetricDetailSchema>;

export const tenantSortValues = [
  "recent-activity",
  "name",
  "created",
  "members",
  "contacts",
  "deals",
  "tickets",
  "activities",
] as const;
export const tenantSortSchema = z.enum(tenantSortValues);
export type TenantSort = z.infer<typeof tenantSortSchema>;
