import { z } from "zod";

export const tenantMetricRowSchema = z.object({
  organizationId: z.string(),
  name: z.string(),
  subdomain: z.string(),
  plan: z.string(),
  subscriptionStatus: z.string().nullable(),
  isPlatformOrg: z.boolean(),
  linkedBrandId: z.string().nullable(),
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

export const tenantSparklinePointSchema = z.object({
  day: z.string(),
  contactCount: z.number(),
  dealCount: z.number(),
  ticketCount: z.number(),
  activityCount: z.number(),
  activeMemberCount: z.number(),
});
export type TenantSparklinePoint = z.infer<typeof tenantSparklinePointSchema>;

export const tenantMetricDetailSchema = tenantMetricRowSchema.extend({
  partnerCount: z.number(),
  customerCount: z.number(),
  series: z.array(tenantSparklinePointSchema),
});
export type TenantMetricDetail = z.infer<typeof tenantMetricDetailSchema>;

export const tenantSortSchema = z.enum(["recent-activity", "name", "created"]);
export type TenantSort = z.infer<typeof tenantSortSchema>;
