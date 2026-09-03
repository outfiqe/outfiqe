import { prisma } from "#db/prisma.js";
import { Prisma } from "#generated/prisma/client.js";

import { ACTIVITY_TREND_WINDOW_DAYS } from "./crm-reporting.constants.js";
import type {
  CrmActivityTrendPoint,
  DealSearchResult,
  PipelineStageReportRow,
  TicketReport,
  TicketSearchResult,
  TicketStatusCountRow,
} from "./crm-reporting.types.js";

type PipelineStageRow = {
  stage_id: string;
  stage_name: string;
  sort_order: number;
  is_won: boolean;
  is_lost: boolean;
  open_deal_count: number;
  open_value: number;
  won_deal_count: number;
  won_value: number;
  lost_deal_count: number;
};

type TicketStatusRow = { status: string; count: number };

type TicketResolutionRow = {
  open_count: number;
  resolved_count: number;
  mean_resolution_seconds: number | null;
};

type DealSearchRow = {
  id: string;
  title: string;
  value: number;
  status: string;
  stage_name: string;
};

type TicketSearchRow = { id: string; title: string; type: string; status: string };

type ActivityTrendRow = { date: string; count: number };

type CountRow = { count: number };

const likeContains = (query: string): string => `%${query}%`;

const ACTIVITY_TREND_SPAN_DAYS = ACTIVITY_TREND_WINDOW_DAYS - 1;

export const crmReportingRepository = {
  async pipelineStageBreakdown(organizationId: string): Promise<PipelineStageReportRow[]> {
    const rows = await prisma.$queryRaw<PipelineStageRow[]>(Prisma.sql`
      SELECT s.id AS stage_id,
             s.name AS stage_name,
             s.sort_order,
             s.is_won,
             s.is_lost,
             (COUNT(d.id) FILTER (WHERE d.status = 'OPEN'))::int AS open_deal_count,
             COALESCE((SUM(d.value) FILTER (WHERE d.status = 'OPEN'))::int, 0) AS open_value,
             (COUNT(d.id) FILTER (WHERE d.status = 'WON'))::int AS won_deal_count,
             COALESCE((SUM(d.value) FILTER (WHERE d.status = 'WON'))::int, 0) AS won_value,
             (COUNT(d.id) FILTER (WHERE d.status = 'LOST'))::int AS lost_deal_count
        FROM pipeline_stages s
        LEFT JOIN deals d
          ON d.stage_id = s.id AND d.organization_id = s.organization_id
       WHERE s.organization_id = ${organizationId}::uuid
       GROUP BY s.id, s.name, s.sort_order, s.is_won, s.is_lost
       ORDER BY s.sort_order ASC
    `);

    return rows.map((row) => ({
      stageId: row.stage_id,
      stageName: row.stage_name,
      sortOrder: row.sort_order,
      isWon: row.is_won,
      isLost: row.is_lost,
      openDealCount: row.open_deal_count,
      openValue: row.open_value,
      wonDealCount: row.won_deal_count,
      wonValue: row.won_value,
      lostDealCount: row.lost_deal_count,
    }));
  },

  async ticketReport(organizationId: string): Promise<TicketReport> {
    const [statusRows, resolutionRows] = await Promise.all([
      prisma.$queryRaw<TicketStatusRow[]>(Prisma.sql`
        SELECT status::text AS status, COUNT(*)::int AS count
          FROM crm_tickets
         WHERE organization_id = ${organizationId}::uuid
         GROUP BY status
      `),
      prisma.$queryRaw<TicketResolutionRow[]>(Prisma.sql`
        SELECT (COUNT(*) FILTER (WHERE status IN ('OPEN', 'IN_PROGRESS')))::int AS open_count,
               (COUNT(*) FILTER (WHERE resolved_at IS NOT NULL))::int AS resolved_count,
               (AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)))
                 FILTER (WHERE resolved_at IS NOT NULL))::float8 AS mean_resolution_seconds
          FROM crm_tickets
         WHERE organization_id = ${organizationId}::uuid
      `),
    ]);

    const statusCounts: TicketStatusCountRow[] = statusRows.map((row) => ({
      status: row.status,
      count: row.count,
    }));
    const [resolution] = resolutionRows;

    return {
      statusCounts,
      openCount: resolution?.open_count ?? 0,
      resolvedCount: resolution?.resolved_count ?? 0,
      meanResolutionSeconds: resolution?.mean_resolution_seconds ?? null,
    };
  },

  async dailyActivityCounts(organizationId: string): Promise<CrmActivityTrendPoint[]> {
    const rows = await prisma.$queryRaw<ActivityTrendRow[]>(Prisma.sql`
      WITH bounds AS (
        SELECT
          date_trunc('day', now() AT TIME ZONE 'UTC') AS today,
          date_trunc('day', now() AT TIME ZONE 'UTC') - make_interval(days => ${ACTIVITY_TREND_SPAN_DAYS}) AS first_day
      ),
      days AS (
        SELECT generate_series((SELECT first_day FROM bounds), (SELECT today FROM bounds), interval '1 day') AS day
      ),
      daily AS (
        SELECT date_trunc('day', occurred_at) AS day, COUNT(*)::int AS count
          FROM crm_activities
         WHERE organization_id = ${organizationId}::uuid
           AND occurred_at >= (SELECT first_day FROM bounds)
         GROUP BY 1
      )
      SELECT to_char(days.day, 'YYYY-MM-DD') AS date, COALESCE(daily.count, 0)::int AS count
        FROM days
        LEFT JOIN daily ON daily.day = days.day
       ORDER BY days.day
    `);

    return rows.map((row) => ({ date: row.date, count: row.count }));
  },

  async openTasksDueTodayCount(organizationId: string): Promise<number> {
    const [row] = await prisma.$queryRaw<CountRow[]>(Prisma.sql`
      SELECT COUNT(*)::int AS count
        FROM crm_tasks
       WHERE organization_id = ${organizationId}::uuid
         AND status = 'OPEN'
         AND due_at < date_trunc('day', now() AT TIME ZONE 'UTC') + interval '1 day'
    `);

    return row?.count ?? 0;
  },

  async searchDeals(
    organizationId: string,
    query: string,
    limit: number,
  ): Promise<DealSearchResult[]> {
    const rows = await prisma.$queryRaw<DealSearchRow[]>(Prisma.sql`
      SELECT d.id, d.title, d.value, d.status::text AS status, s.name AS stage_name
        FROM deals d
        JOIN pipeline_stages s ON s.id = d.stage_id
       WHERE d.organization_id = ${organizationId}::uuid
         AND d.title ILIKE ${likeContains(query)}
       ORDER BY d.updated_at DESC
       LIMIT ${limit}
    `);

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      value: row.value,
      status: row.status,
      stageName: row.stage_name,
    }));
  },

  async searchTickets(
    organizationId: string,
    query: string,
    limit: number,
  ): Promise<TicketSearchResult[]> {
    const rows = await prisma.$queryRaw<TicketSearchRow[]>(Prisma.sql`
      SELECT id, title, type::text AS type, status::text AS status
        FROM crm_tickets
       WHERE organization_id = ${organizationId}::uuid
         AND title ILIKE ${likeContains(query)}
       ORDER BY updated_at DESC
       LIMIT ${limit}
    `);

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      type: row.type,
      status: row.status,
    }));
  },
};
