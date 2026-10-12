import { prisma } from "#db/prisma.js";
import { Prisma } from "#generated/prisma/client.js";
import type { TagApprovalSource, TagRejectionReason } from "#generated/prisma/enums.js";
import { BrandTagReviewPolicy, TagReviewStatus } from "#generated/prisma/enums.js";

import type { PeriodTrend, ReviewLatencyByPolicy, TagReviewMetrics } from "../tag-review.types.js";

const SLA_DECISION_WINDOW_DAYS = 7;
const REPORT_RECENT_WINDOW_DAYS = 30;
const TREND_WINDOW_DAYS = 7;

export const tagReviewMetricsRepository = {
  async getMetrics(): Promise<TagReviewMetrics> {
    const dayMs = 24 * 60 * 60 * 1000;
    const slaCutoff = new Date(Date.now() - SLA_DECISION_WINDOW_DAYS * dayMs);
    const reportRecentCutoff = new Date(Date.now() - REPORT_RECENT_WINDOW_DAYS * dayMs);
    const trendCutoff = new Date(Date.now() - TREND_WINDOW_DAYS * dayMs);
    const trendPriorCutoff = new Date(Date.now() - 2 * TREND_WINDOW_DAYS * dayMs);

    const [
      latencyRows,
      sourceRows,
      reasonRows,
      firstShoppableRows,
      stuckRows,
      reportRows,
      tagsLiveRows,
      manualReviewRateRows,
      medianTimeToLiveRows,
    ] = await Promise.all([
      prisma.$queryRaw<
        {
          policy: BrandTagReviewPolicy;
          decided_count: number;
          p50: number | null;
          p90: number | null;
        }[]
      >(Prisma.sql`
          SELECT b.tag_review_policy AS policy,
                 COUNT(*)::int AS decided_count,
                 percentile_cont(0.5) WITHIN GROUP (
                   ORDER BY EXTRACT(EPOCH FROM (clp.reviewed_at - clp.submitted_at))
                 ) AS p50,
                 percentile_cont(0.9) WITHIN GROUP (
                   ORDER BY EXTRACT(EPOCH FROM (clp.reviewed_at - clp.submitted_at))
                 ) AS p90
          FROM creator_look_products clp
          JOIN products p ON p.id = clp.product_id
          JOIN brands b ON b.id = p.brand_id
          WHERE clp.reviewed_by_id IS NOT NULL AND clp.reviewed_at IS NOT NULL
          GROUP BY b.tag_review_policy
        `),
      prisma.$queryRaw<{ approval_source: TagApprovalSource; count: number }[]>(Prisma.sql`
          SELECT approval_source, COUNT(*)::int AS count
          FROM creator_look_products
          WHERE review_status = 'APPROVED' AND approval_source IS NOT NULL
          GROUP BY approval_source
        `),
      prisma.$queryRaw<{ rejection_reason: TagRejectionReason; count: number }[]>(Prisma.sql`
          SELECT rejection_reason, COUNT(*)::int AS count
          FROM creator_look_products
          WHERE review_status = 'REJECTED' AND rejection_reason IS NOT NULL
          GROUP BY rejection_reason
        `),
      prisma.$queryRaw<{ looks: number; p50: number | null; p90: number | null }[]>(Prisma.sql`
          WITH first_approved AS (
            SELECT clp.creator_look_id,
                   MIN(COALESCE(clp.reviewed_at, clp.submitted_at)) AS approved_at
            FROM creator_look_products clp
            WHERE clp.review_status = 'APPROVED'
            GROUP BY clp.creator_look_id
          )
          SELECT COUNT(*)::int AS looks,
                 percentile_cont(0.5) WITHIN GROUP (
                   ORDER BY EXTRACT(EPOCH FROM (fa.approved_at - cl.created_at))
                 ) AS p50,
                 percentile_cont(0.9) WITHIN GROUP (
                   ORDER BY EXTRACT(EPOCH FROM (fa.approved_at - cl.created_at))
                 ) AS p90
          FROM first_approved fa
          JOIN creator_looks cl ON cl.id = fa.creator_look_id
          WHERE cl.deleted_at IS NULL
        `),
      prisma.creatorLookProduct.count({
        where: {
          reviewStatus: TagReviewStatus.PENDING,
          submittedAt: { lt: slaCutoff },
          creatorLook: { deletedAt: null },
          product: { brand: { tagReviewPolicy: BrandTagReviewPolicy.APPROVAL_REQUIRED } },
        },
      }),
      prisma.$queryRaw<{ open: number; last30: number; last7: number }[]>(Prisma.sql`
          SELECT COUNT(*) FILTER (WHERE status = 'OPEN')::int AS open,
                 COUNT(*) FILTER (WHERE created_at >= ${reportRecentCutoff})::int AS last30,
                 COUNT(*) FILTER (WHERE created_at >= ${trendCutoff})::int AS last7
          FROM tag_review_reports
        `),
      prisma.$queryRaw<{ current: number; previous: number }[]>(Prisma.sql`
          SELECT
            COUNT(*) FILTER (WHERE review_status = 'APPROVED')::int AS current,
            COUNT(*) FILTER (
              WHERE review_status = 'APPROVED' AND reviewed_at <= ${trendCutoff}
            )::int AS previous
          FROM creator_look_products
        `),
      prisma.$queryRaw<
        {
          current_total: number;
          current_manual: number;
          previous_total: number;
          previous_manual: number;
        }[]
      >(Prisma.sql`
          SELECT
            COUNT(*) FILTER (
              WHERE review_status = 'APPROVED' AND reviewed_at >= ${trendCutoff}
            )::int AS current_total,
            COUNT(*) FILTER (
              WHERE review_status = 'APPROVED' AND reviewed_at >= ${trendCutoff}
                AND approval_source = 'BRAND'
            )::int AS current_manual,
            COUNT(*) FILTER (
              WHERE review_status = 'APPROVED' AND reviewed_at >= ${trendPriorCutoff}
                AND reviewed_at < ${trendCutoff}
            )::int AS previous_total,
            COUNT(*) FILTER (
              WHERE review_status = 'APPROVED' AND reviewed_at >= ${trendPriorCutoff}
                AND reviewed_at < ${trendCutoff} AND approval_source = 'BRAND'
            )::int AS previous_manual
          FROM creator_look_products
        `),
      prisma.$queryRaw<{ current_p50: number | null; previous_p50: number | null }[]>(Prisma.sql`
          WITH first_approved AS (
            SELECT clp.creator_look_id,
                   MIN(COALESCE(clp.reviewed_at, clp.submitted_at)) AS approved_at
            FROM creator_look_products clp
            WHERE clp.review_status = 'APPROVED'
            GROUP BY clp.creator_look_id
          )
          SELECT
            percentile_cont(0.5) WITHIN GROUP (
              ORDER BY EXTRACT(EPOCH FROM (fa.approved_at - cl.created_at))
            ) FILTER (WHERE fa.approved_at >= ${trendCutoff}) AS current_p50,
            percentile_cont(0.5) WITHIN GROUP (
              ORDER BY EXTRACT(EPOCH FROM (fa.approved_at - cl.created_at))
            ) FILTER (
              WHERE fa.approved_at >= ${trendPriorCutoff} AND fa.approved_at < ${trendCutoff}
            ) AS previous_p50
          FROM first_approved fa
          JOIN creator_looks cl ON cl.id = fa.creator_look_id
          WHERE cl.deleted_at IS NULL
        `),
    ]);

    const toHours = (seconds: number | null): number | null =>
      seconds === null ? null : Math.round((Number(seconds) / 3600) * 10) / 10;

    const toPeriodTrend = (value: number | null, previousValue: number | null): PeriodTrend => {
      if (value === null || previousValue === null || previousValue === 0) {
        return { value, previousValue, deltaPercent: null };
      }
      const deltaPercent = Math.round(((value - previousValue) / previousValue) * 1000) / 10;
      return { value, previousValue, deltaPercent };
    };

    const latencyByPolicy: ReviewLatencyByPolicy[] = latencyRows.map((row) => ({
      policy: row.policy,
      decidedCount: row.decided_count,
      p50Hours: toHours(row.p50),
      p90Hours: toHours(row.p90),
    }));

    const firstShoppable = firstShoppableRows[0] ?? { looks: 0, p50: null, p90: null };
    const reportTotals = reportRows[0] ?? { open: 0, last30: 0, last7: 0 };

    const tagsLive = tagsLiveRows[0] ?? { current: 0, previous: 0 };

    const manualReviewRate = manualReviewRateRows[0] ?? {
      current_total: 0,
      current_manual: 0,
      previous_total: 0,
      previous_manual: 0,
    };
    const manualReviewRatePercent = (total: number, manual: number): number | null =>
      total === 0 ? null : Math.round((manual / total) * 1000) / 10;

    const medianTimeToLive = medianTimeToLiveRows[0] ?? { current_p50: null, previous_p50: null };

    return {
      overview: {
        tagsLive: toPeriodTrend(tagsLive.current, tagsLive.previous),
        manualReviewRatePercent: toPeriodTrend(
          manualReviewRatePercent(manualReviewRate.current_total, manualReviewRate.current_manual),
          manualReviewRatePercent(
            manualReviewRate.previous_total,
            manualReviewRate.previous_manual,
          ),
        ),
        medianTimeToLiveHours: toPeriodTrend(
          toHours(medianTimeToLive.current_p50),
          toHours(medianTimeToLive.previous_p50),
        ),
        openIssues: {
          count: reportTotals.open + stuckRows,
          newLast7d: reportTotals.last7,
        },
      },
      reviewLatencyByPolicy: latencyByPolicy,
      approvalSourceMix: sourceRows.map((row) => ({
        source: row.approval_source,
        count: row.count,
      })),
      rejectionReasonMix: reasonRows.map((row) => ({
        reason: row.rejection_reason,
        count: row.count,
      })),
      timeToFirstShoppable: {
        looksWithApprovedTag: firstShoppable.looks,
        p50Hours: toHours(firstShoppable.p50),
        p90Hours: toHours(firstShoppable.p90),
      },
      stuckApprovalRequiredCount: stuckRows,
      reports: { open: reportTotals.open, last30Days: reportTotals.last30 },
    };
  },
};
