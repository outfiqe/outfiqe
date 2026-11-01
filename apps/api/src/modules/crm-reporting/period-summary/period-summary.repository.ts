import { prisma } from "#db/prisma.js";
import { Prisma } from "#generated/prisma/client.js";
import { DealStatus } from "#generated/prisma/enums.js";

import { REPORT_TEAM_ROW_LIMIT } from "../crm-reporting.constants.js";
import type { CrmPeriodSummary, CrmTeamMemberSummary } from "../crm-reporting.types.js";

type ReportPeriod = { from: Date; to: Date };

type TeamMemberRow = {
  membership_id: string;
  name: string;
  won_deal_count: number;
  won_value: number;
  resolved_ticket_count: number;
  completed_task_count: number;
  activity_count: number;
};

type MeanResolutionRow = { mean_resolution_seconds: number | null };

export const crmPeriodSummaryRepository = {
  async salesSummary(
    organizationId: string,
    { from, to }: ReportPeriod,
  ): Promise<CrmPeriodSummary["sales"]> {
    const closedInPeriod = { organizationId, closedAt: { gte: from, lte: to } };
    const [newDealCount, won, lostDealCount] = await Promise.all([
      prisma.deal.count({ where: { organizationId, createdAt: { gte: from, lte: to } } }),
      prisma.deal.aggregate({
        where: { ...closedInPeriod, status: DealStatus.WON },
        _count: { _all: true },
        _sum: { value: true },
      }),
      prisma.deal.count({ where: { ...closedInPeriod, status: DealStatus.LOST } }),
    ]);
    return {
      newDealCount,
      wonDealCount: won._count._all,
      wonValue: won._sum.value ?? 0,
      lostDealCount,
    };
  },

  async supportSummary(
    organizationId: string,
    { from, to }: ReportPeriod,
  ): Promise<CrmPeriodSummary["support"]> {
    const [openedCount, resolvedCount, resolutionRows] = await Promise.all([
      prisma.crmTicket.count({ where: { organizationId, createdAt: { gte: from, lte: to } } }),
      prisma.crmTicket.count({ where: { organizationId, resolvedAt: { gte: from, lte: to } } }),
      prisma.$queryRaw<MeanResolutionRow[]>(Prisma.sql`
        SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)))::float8
                 AS mean_resolution_seconds
          FROM crm_tickets
         WHERE organization_id = ${organizationId}::uuid
           AND resolved_at BETWEEN ${from} AND ${to}
      `),
    ]);
    return {
      openedCount,
      resolvedCount,
      meanResolutionSeconds: resolutionRows[0]?.mean_resolution_seconds ?? null,
    };
  },

  async teamSummary(
    organizationId: string,
    { from, to }: ReportPeriod,
  ): Promise<CrmTeamMemberSummary[]> {
    const rows = await prisma.$queryRaw<TeamMemberRow[]>(Prisma.sql`
      SELECT m.id AS membership_id,
             u.name,
             (SELECT COUNT(*)::int FROM deals d
               WHERE d.organization_id = m.organization_id
                 AND d.owner_membership_id = m.id
                 AND d.status = 'WON'
                 AND d.closed_at BETWEEN ${from} AND ${to}) AS won_deal_count,
             (SELECT COALESCE(SUM(d.value), 0)::int FROM deals d
               WHERE d.organization_id = m.organization_id
                 AND d.owner_membership_id = m.id
                 AND d.status = 'WON'
                 AND d.closed_at BETWEEN ${from} AND ${to}) AS won_value,
             (SELECT COUNT(*)::int FROM crm_tickets t
               WHERE t.organization_id = m.organization_id
                 AND t.assignee_membership_id = m.id
                 AND t.resolved_at BETWEEN ${from} AND ${to}) AS resolved_ticket_count,
             (SELECT COUNT(*)::int FROM crm_tasks k
               WHERE k.organization_id = m.organization_id
                 AND k.assignee_membership_id = m.id
                 AND k.completed_at BETWEEN ${from} AND ${to}) AS completed_task_count,
             (SELECT COUNT(*)::int FROM crm_activities a
               WHERE a.organization_id = m.organization_id
                 AND a.author_membership_id = m.id
                 AND a.occurred_at BETWEEN ${from} AND ${to}) AS activity_count
        FROM memberships m
        JOIN users u ON u.id = m.user_id
       WHERE m.organization_id = ${organizationId}::uuid
         AND m.status = 'ACTIVE'
       ORDER BY won_value DESC, resolved_ticket_count DESC, u.name ASC
       LIMIT ${REPORT_TEAM_ROW_LIMIT}
    `);

    return rows.map((row) => ({
      membershipId: row.membership_id,
      name: row.name,
      wonDealCount: row.won_deal_count,
      wonValue: row.won_value,
      resolvedTicketCount: row.resolved_ticket_count,
      completedTaskCount: row.completed_task_count,
      activityCount: row.activity_count,
    }));
  },
};
