import { prisma } from "#db/prisma.js";
import { Prisma } from "#generated/prisma/client.js";
import { CommissionStatus } from "#generated/prisma/enums.js";

import { COMPARISON_WINDOW_DAYS, TREND_WINDOW_DAYS } from "./creator-overview.constants.js";
import type {
  CreatorOverviewTrendPoint,
  EarningsWindowRow,
  LookAggregates,
} from "./creator-overview.types.js";

type RawTrendRow = {
  date: string;
  earnings: bigint;
  cumulative_earnings: bigint;
  looks: bigint;
};

type RawEarningsWindowRow = {
  last_window: bigint;
  previous_window: bigint;
};

const TREND_SPAN_DAYS = TREND_WINDOW_DAYS - 1;

export const creatorOverviewRepository = {
  async getDailyTrend(creatorId: string): Promise<CreatorOverviewTrendPoint[]> {
    const rows = await prisma.$queryRaw<RawTrendRow[]>(Prisma.sql`
      WITH bounds AS (
        SELECT
          date_trunc('day', now() AT TIME ZONE 'UTC') AS today,
          date_trunc('day', now() AT TIME ZONE 'UTC') - make_interval(days => ${TREND_SPAN_DAYS}) AS first_day
      ),
      days AS (
        SELECT generate_series((SELECT first_day FROM bounds), (SELECT today FROM bounds), interval '1 day') AS day
      ),
      daily_earnings AS (
        SELECT date_trunc('day', created_at) AS day, SUM(amount)::bigint AS earnings
        FROM creator_commissions
        WHERE creator_id = ${creatorId}::uuid
          AND created_at >= (SELECT first_day FROM bounds)
          AND status::text <> ${CommissionStatus.VOIDED}
        GROUP BY 1
      ),
      daily_looks AS (
        SELECT date_trunc('day', created_at) AS day, COUNT(*)::bigint AS looks
        FROM creator_looks
        WHERE creator_id = ${creatorId}::uuid
          AND created_at >= (SELECT first_day FROM bounds)
          AND deleted_at IS NULL
        GROUP BY 1
      )
      SELECT
        to_char(days.day, 'YYYY-MM-DD') AS date,
        COALESCE(daily_earnings.earnings, 0)::bigint AS earnings,
        SUM(COALESCE(daily_earnings.earnings, 0)) OVER (ORDER BY days.day)::bigint AS cumulative_earnings,
        COALESCE(daily_looks.looks, 0)::bigint AS looks
      FROM days
      LEFT JOIN daily_earnings ON daily_earnings.day = days.day
      LEFT JOIN daily_looks ON daily_looks.day = days.day
      ORDER BY days.day
    `);

    return rows.map((row) => ({
      date: row.date,
      earnings: Number(row.earnings),
      cumulativeEarnings: Number(row.cumulative_earnings),
      looks: Number(row.looks),
    }));
  },

  async getEarningsWindows(creatorId: string): Promise<EarningsWindowRow> {
    const [row] = await prisma.$queryRaw<RawEarningsWindowRow[]>(Prisma.sql`
      WITH bounds AS (
        SELECT
          (now() AT TIME ZONE 'UTC') - make_interval(days => ${COMPARISON_WINDOW_DAYS}) AS current_start,
          (now() AT TIME ZONE 'UTC') - make_interval(days => ${COMPARISON_WINDOW_DAYS * 2}) AS previous_start
      )
      SELECT
        COALESCE(
          SUM(amount) FILTER (WHERE created_at >= (SELECT current_start FROM bounds)),
          0
        )::bigint AS last_window,
        COALESCE(
          SUM(amount) FILTER (
            WHERE created_at >= (SELECT previous_start FROM bounds)
              AND created_at < (SELECT current_start FROM bounds)
          ),
          0
        )::bigint AS previous_window
      FROM creator_commissions
      WHERE creator_id = ${creatorId}::uuid
        AND status::text <> ${CommissionStatus.VOIDED}
        AND created_at >= (SELECT previous_start FROM bounds)
    `);

    return {
      last30: Number(row?.last_window ?? 0),
      previous30: Number(row?.previous_window ?? 0),
    };
  },

  async getLookAggregates(creatorId: string): Promise<LookAggregates> {
    const aggregate = await prisma.creatorLook.aggregate({
      where: { creatorId, deletedAt: null },
      _count: { _all: true },
      _sum: { likeCount: true },
    });

    return {
      lookCount: aggregate._count._all,
      totalLikes: aggregate._sum.likeCount ?? 0,
    };
  },

  async getFollowerCount(creatorId: string): Promise<number> {
    const user = await prisma.user.findUnique({
      where: { id: creatorId },
      select: { followerCount: true },
    });

    return user?.followerCount ?? 0;
  },
};
