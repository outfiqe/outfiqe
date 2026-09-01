import { startOfDay } from "date-fns/startOfDay";
import { subDays } from "date-fns/subDays";

import { prisma, prismaRead } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";

import { ACTIVE_MEMBER_WINDOW_DAYS } from "./platform-metrics.constants.js";
import type {
  PlatformOverview,
  TenantMetricListFilters,
  TenantMetricListPage,
  TenantMetricRow,
  TenantSparklinePoint,
} from "./platform-metrics.types.js";

const tenantRowSelect = {
  id: true,
  name: true,
  subdomain: true,
  plan: true,
  isPlatformOrg: true,
  linkedBrandId: true,
  contactCount: true,
  dealCount: true,
  ticketCount: true,
  activityCount: true,
  lastCrmActivityAt: true,
  createdAt: true,
  subscription: { select: { status: true } },
  _count: { select: { memberships: true } },
} as const;

type TenantSelectRow = Prisma.OrganizationGetPayload<{ select: typeof tenantRowSelect }>;

const toTenantMetricRow = (row: TenantSelectRow): TenantMetricRow => ({
  organizationId: row.id,
  name: row.name,
  subdomain: row.subdomain,
  plan: row.plan,
  subscriptionStatus: row.subscription?.status ?? null,
  isPlatformOrg: row.isPlatformOrg,
  linkedBrandId: row.linkedBrandId,
  memberCount: row._count.memberships,
  contactCount: row.contactCount,
  dealCount: row.dealCount,
  ticketCount: row.ticketCount,
  activityCount: row.activityCount,
  lastCrmActivityAt: row.lastCrmActivityAt,
  createdAt: row.createdAt,
});

const orderByFor = (
  sort: TenantMetricListFilters["sort"],
): Prisma.OrganizationOrderByWithRelationInput[] => {
  if (sort === "name") return [{ name: "asc" }];
  if (sort === "created") return [{ createdAt: "desc" }];
  return [{ lastCrmActivityAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }];
};

export const platformMetricsRepository = {
  async listTenants(filters: TenantMetricListFilters): Promise<TenantMetricListPage> {
    const where: Prisma.OrganizationWhereInput = {};
    if (filters.plan) where.plan = filters.plan;
    const skip = (filters.page - 1) * filters.pageSize;

    const [rows, total] = await Promise.all([
      prismaRead.organization.findMany({
        where,
        orderBy: orderByFor(filters.sort),
        skip,
        take: filters.pageSize,
        select: tenantRowSelect,
      }),
      prismaRead.organization.count({ where }),
    ]);

    return {
      items: rows.map(toTenantMetricRow),
      total,
      hasMore: skip + rows.length < total,
    };
  },

  async findTenant(organizationId: string): Promise<TenantMetricRow | null> {
    const row = await prismaRead.organization.findUnique({
      where: { id: organizationId },
      select: tenantRowSelect,
    });
    return row ? toTenantMetricRow(row) : null;
  },

  async overview(): Promise<PlatformOverview> {
    const [byPlan, totals, totalMembers] = await Promise.all([
      prismaRead.organization.groupBy({ by: ["plan"], _count: { _all: true } }),
      prismaRead.organization.aggregate({
        _count: { _all: true },
        _sum: {
          contactCount: true,
          dealCount: true,
          ticketCount: true,
          activityCount: true,
        },
      }),
      prismaRead.membership.count(),
    ]);

    return {
      tenantCount: totals._count._all,
      tenantsByPlan: byPlan
        .map((entry) => ({ plan: entry.plan, count: entry._count._all }))
        .sort((a, b) => b.count - a.count),
      totalContacts: totals._sum.contactCount ?? 0,
      totalDeals: totals._sum.dealCount ?? 0,
      totalTickets: totals._sum.ticketCount ?? 0,
      totalActivities: totals._sum.activityCount ?? 0,
      totalMembers,
    };
  },

  async sparkline(organizationId: string, days: number): Promise<TenantSparklinePoint[]> {
    const since = startOfDay(subDays(new Date(), days));
    const rows = await prismaRead.orgActivityRollup.findMany({
      where: { organizationId, day: { gte: since } },
      orderBy: { day: "asc" },
      select: {
        day: true,
        contactCount: true,
        dealCount: true,
        ticketCount: true,
        activityCount: true,
        activeMemberCount: true,
      },
    });

    return rows.map((row) => ({
      day: row.day.toISOString().slice(0, 10),
      contactCount: row.contactCount,
      dealCount: row.dealCount,
      ticketCount: row.ticketCount,
      activityCount: row.activityCount,
      activeMemberCount: row.activeMemberCount,
    }));
  },

  async activeMemberCountsByOrg(): Promise<Map<string, number>> {
    const since = startOfDay(subDays(new Date(), ACTIVE_MEMBER_WINDOW_DAYS));
    const rows = await prismaRead.$queryRaw<{ organization_id: string; active_members: bigint }[]>`
      SELECT organization_id, COUNT(DISTINCT author_membership_id)::bigint AS active_members
      FROM crm_activities
      WHERE occurred_at >= ${since} AND author_membership_id IS NOT NULL
      GROUP BY organization_id
    `;
    return new Map(rows.map((row) => [row.organization_id, Number(row.active_members)]));
  },

  async listOrganizationSnapshotInputs(): Promise<
    {
      id: string;
      contactCount: number;
      dealCount: number;
      ticketCount: number;
      activityCount: number;
    }[]
  > {
    return prismaRead.organization.findMany({
      select: {
        id: true,
        contactCount: true,
        dealCount: true,
        ticketCount: true,
        activityCount: true,
      },
    });
  },

  async upsertRollup(
    organizationId: string,
    day: Date,
    counts: {
      contactCount: number;
      dealCount: number;
      ticketCount: number;
      activityCount: number;
      activeMemberCount: number;
    },
  ): Promise<void> {
    await prisma.orgActivityRollup.upsert({
      where: { organizationId_day: { organizationId, day } },
      create: { organizationId, day, ...counts },
      update: counts,
    });
  },
};
