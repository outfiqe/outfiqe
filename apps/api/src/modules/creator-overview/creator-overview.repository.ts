import { prisma } from "#db/prisma.js";
import { Prisma } from "#generated/prisma/client.js";
import { CommissionStatus } from "#generated/prisma/enums.js";

import { TOP_LOOK_LIMIT } from "./creator-overview.constants.js";
import type {
  CreatorEarningsBySource,
  CreatorOverviewTrendPoint,
  CreatorTopLook,
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

type RawTopLookRow = {
  id: string;
  image_url: string;
  caption: string | null;
  like_count: number;
  sales_count: bigint;
  earnings: bigint;
};

type RawEarningsBySourceRow = {
  source: CreatorEarningsBySource["source"];
  earnings: bigint;
  sales_count: bigint;
};

const TODAY_COUNTED_IN_PERIOD = 1;
const WINDOWS_COMPARED = 2;
const NOT_YET_WITHDRAWABLE_STATUSES = [CommissionStatus.PENDING, CommissionStatus.APPROVED];

export const creatorOverviewRepository = {
  async getDailyTrend(creatorId: string, periodDays: number): Promise<CreatorOverviewTrendPoint[]> {
    const trendSpanDays = periodDays - TODAY_COUNTED_IN_PERIOD;
    const rows = await prisma.$queryRaw<RawTrendRow[]>(Prisma.sql`
      WITH bounds AS (
        SELECT
          date_trunc('day', now() AT TIME ZONE 'UTC') AS today,
          date_trunc('day', now() AT TIME ZONE 'UTC') - make_interval(days => ${trendSpanDays}) AS first_day
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

  async getEarningsWindows(creatorId: string, periodDays: number): Promise<EarningsWindowRow> {
    const [row] = await prisma.$queryRaw<RawEarningsWindowRow[]>(Prisma.sql`
      WITH bounds AS (
        SELECT
          (now() AT TIME ZONE 'UTC') - make_interval(days => ${periodDays}) AS current_start,
          (now() AT TIME ZONE 'UTC') - make_interval(days => ${periodDays * WINDOWS_COMPARED}) AS previous_start
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
      period: Number(row?.last_window ?? 0),
      previousPeriod: Number(row?.previous_window ?? 0),
    };
  },

  async getTopLooks(creatorId: string, periodDays: number): Promise<CreatorTopLook[]> {
    const rows = await prisma.$queryRaw<RawTopLookRow[]>(Prisma.sql`
      SELECT
        cl.id,
        cl.image_url,
        cl.caption,
        cl.like_count,
        COUNT(cc.id)::bigint AS sales_count,
        COALESCE(SUM(cc.amount), 0)::bigint AS earnings
      FROM creator_looks cl
      LEFT JOIN order_items oi ON oi.attributed_creator_look_id = cl.id
      LEFT JOIN creator_commissions cc
        ON cc.order_item_id = oi.id
        AND cc.creator_id = cl.creator_id
        AND cc.status::text <> ${CommissionStatus.VOIDED}
        AND cc.created_at >= (now() AT TIME ZONE 'UTC') - make_interval(days => ${periodDays})
      WHERE cl.creator_id = ${creatorId}::uuid AND cl.deleted_at IS NULL
      GROUP BY cl.id
      ORDER BY earnings DESC, cl.like_count DESC, cl.id
      LIMIT ${TOP_LOOK_LIMIT}
    `);

    return rows.map((row) => ({
      id: row.id,
      imageUrl: row.image_url,
      caption: row.caption,
      likeCount: row.like_count,
      salesCount: Number(row.sales_count),
      earnings: Number(row.earnings),
    }));
  },

  async getEarningsBySource(
    creatorId: string,
    periodDays: number,
  ): Promise<CreatorEarningsBySource[]> {
    const rows = await prisma.$queryRaw<RawEarningsBySourceRow[]>(Prisma.sql`
      SELECT
        source,
        SUM(amount)::bigint AS earnings,
        COUNT(*)::bigint AS sales_count
      FROM creator_commissions
      WHERE creator_id = ${creatorId}::uuid
        AND status::text <> ${CommissionStatus.VOIDED}
        AND created_at >= (now() AT TIME ZONE 'UTC') - make_interval(days => ${periodDays})
      GROUP BY source
      ORDER BY earnings DESC, source
    `);

    return rows.map((row) => ({
      source: row.source,
      earnings: Number(row.earnings),
      salesCount: Number(row.sales_count),
    }));
  },

  async findNextAvailableAt(creatorId: string): Promise<Date | null> {
    const { _min: earliest } = await prisma.creatorCommission.aggregate({
      where: {
        creatorId,
        status: { in: NOT_YET_WITHDRAWABLE_STATUSES },
        availableAt: { gte: new Date() },
      },
      _min: { availableAt: true },
    });
    return earliest.availableAt;
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

  async getCreatorProfile(creatorId: string): Promise<{ followerCount: number; handle: string }> {
    const user = await prisma.user.findUnique({
      where: { id: creatorId },
      select: { followerCount: true, handle: true },
    });

    return { followerCount: user?.followerCount ?? 0, handle: user?.handle ?? "" };
  },
};
