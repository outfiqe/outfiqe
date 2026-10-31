import { subDays } from "date-fns/subDays";

import { prisma } from "#db/prisma.js";
import { Prisma } from "#generated/prisma/client.js";
import type { TagApprovalSource, TagRejectionReason } from "#generated/prisma/enums.js";
import { BrandTagReviewPolicy, TagReviewStatus } from "#generated/prisma/enums.js";

import type {
  PeriodTrend,
  ReviewLatencyByPolicy,
  TagReviewMetrics,
  TagReviewOverview,
} from "../tag-review.types.js";
import {
  LOOK_IS_LIVE_SQL,
  roundToOneDecimal,
  secondsToHours,
  STUCK_TAG_AGE_DAYS,
  TAG_APPROVED_AT_SQL,
  TREND_WINDOW_DAYS,
} from "./metrics.sql.js";

const REPORT_RECENT_WINDOW_DAYS = 30;
const PRIOR_TREND_CUTOFF_DAYS = TREND_WINDOW_DAYS + TREND_WINDOW_DAYS;

const PERCENT_PER_RATIO = 100;
const NO_PRIOR_ACTIVITY = 0;
const NO_APPROVED_TAGS = 0;

type MetricsCutoffs = {
  slaCutoff: Date;
  reportRecentCutoff: Date;
  trendCutoff: Date;
  trendPriorCutoff: Date;
};

type ReviewLatencyRow = {
  policy: BrandTagReviewPolicy;
  decided_count: number;
  p50: number | null;
  p90: number | null;
};

type FirstShoppableRow = { looks: number; p50: number | null; p90: number | null };
type ReportTotalsRow = { open: number; last30: number; last7: number };
type TagsLiveRow = { current: number; previous: number };

type ManualReviewRateRow = {
  current_total: number;
  current_manual: number;
  previous_total: number;
  previous_manual: number;
};

type MedianTimeToLiveRow = {
  current_looks: number;
  current_p50: number | null;
  previous_p50: number | null;
};

const EMPTY_FIRST_SHOPPABLE: FirstShoppableRow = { looks: 0, p50: null, p90: null };
const EMPTY_REPORT_TOTALS: ReportTotalsRow = { open: 0, last30: 0, last7: 0 };
const EMPTY_TAGS_LIVE: TagsLiveRow = { current: 0, previous: 0 };

const EMPTY_MANUAL_REVIEW_RATE: ManualReviewRateRow = {
  current_total: 0,
  current_manual: 0,
  previous_total: 0,
  previous_manual: 0,
};

const EMPTY_MEDIAN_TIME_TO_LIVE: MedianTimeToLiveRow = {
  current_looks: 0,
  current_p50: null,
  previous_p50: null,
};

const buildMetricsCutoffs = (): MetricsCutoffs => {
  const now = new Date();
  return {
    slaCutoff: subDays(now, STUCK_TAG_AGE_DAYS),
    reportRecentCutoff: subDays(now, REPORT_RECENT_WINDOW_DAYS),
    trendCutoff: subDays(now, TREND_WINDOW_DAYS),
    trendPriorCutoff: subDays(now, PRIOR_TREND_CUTOFF_DAYS),
  };
};

const toPercentWithOneDecimal = (ratio: number): number =>
  roundToOneDecimal(ratio * PERCENT_PER_RATIO);

const toHours = (seconds: number | null): number | null =>
  seconds === null ? null : secondsToHours(seconds);

const toPeriodTrend = (value: number | null, previousValue: number | null): PeriodTrend => {
  if (value === null || previousValue === null || previousValue === NO_PRIOR_ACTIVITY) {
    return { value, previousValue, deltaPercent: null };
  }
  const deltaPercent = toPercentWithOneDecimal((value - previousValue) / previousValue);
  return { value, previousValue, deltaPercent };
};

const toManualReviewRatePercent = (total: number, manual: number): number | null =>
  total === NO_APPROVED_TAGS ? null : toPercentWithOneDecimal(manual / total);

const fetchReviewLatencyRows = (): Promise<ReviewLatencyRow[]> =>
  prisma.$queryRaw<ReviewLatencyRow[]>(Prisma.sql`
    SELECT b.tag_review_policy AS policy,
           COUNT(*)::int AS decided_count,
           percentile_cont(0.5) WITHIN GROUP (
             ORDER BY EXTRACT(EPOCH FROM (clp.reviewed_at - clp.submitted_at))
           ) AS p50,
           percentile_cont(0.9) WITHIN GROUP (
             ORDER BY EXTRACT(EPOCH FROM (clp.reviewed_at - clp.submitted_at))
           ) AS p90
    FROM creator_look_products clp
    JOIN creator_looks cl ON cl.id = clp.creator_look_id
    JOIN products p ON p.id = clp.product_id
    JOIN brands b ON b.id = p.brand_id
    WHERE clp.reviewed_by_id IS NOT NULL AND clp.reviewed_at IS NOT NULL
      AND ${LOOK_IS_LIVE_SQL}
    GROUP BY b.tag_review_policy
  `);

const fetchApprovalSourceRows = () =>
  prisma.$queryRaw<{ approval_source: TagApprovalSource; count: number }[]>(Prisma.sql`
    SELECT clp.approval_source, COUNT(*)::int AS count
    FROM creator_look_products clp
    JOIN creator_looks cl ON cl.id = clp.creator_look_id
    WHERE clp.review_status = 'APPROVED' AND clp.approval_source IS NOT NULL
      AND ${LOOK_IS_LIVE_SQL}
    GROUP BY clp.approval_source
  `);

const fetchRejectionReasonRows = () =>
  prisma.$queryRaw<{ rejection_reason: TagRejectionReason; count: number }[]>(Prisma.sql`
    SELECT clp.rejection_reason, COUNT(*)::int AS count
    FROM creator_look_products clp
    JOIN creator_looks cl ON cl.id = clp.creator_look_id
    WHERE clp.review_status = 'REJECTED' AND clp.rejection_reason IS NOT NULL
      AND ${LOOK_IS_LIVE_SQL}
    GROUP BY clp.rejection_reason
  `);

const fetchFirstShoppableTimes = async (): Promise<FirstShoppableRow> => {
  const [firstShoppable = EMPTY_FIRST_SHOPPABLE] = await prisma.$queryRaw<
    FirstShoppableRow[]
  >(Prisma.sql`
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
  `);
  return firstShoppable;
};

const countStuckApprovalRequiredTags = (slaCutoff: Date): Promise<number> =>
  prisma.creatorLookProduct.count({
    where: {
      reviewStatus: TagReviewStatus.PENDING,
      submittedAt: { lt: slaCutoff },
      creatorLook: { deletedAt: null },
      product: { brand: { tagReviewPolicy: BrandTagReviewPolicy.APPROVAL_REQUIRED } },
    },
  });

const countWaitingTags = (): Promise<number> =>
  prisma.creatorLookProduct.count({
    where: { reviewStatus: TagReviewStatus.PENDING, creatorLook: { deletedAt: null } },
  });

const fetchReportTotals = async ({
  reportRecentCutoff,
  trendCutoff,
}: MetricsCutoffs): Promise<ReportTotalsRow> => {
  const [reportTotals = EMPTY_REPORT_TOTALS] = await prisma.$queryRaw<ReportTotalsRow[]>(Prisma.sql`
    SELECT COUNT(*) FILTER (WHERE status = 'OPEN')::int AS open,
           COUNT(*) FILTER (WHERE created_at >= ${reportRecentCutoff})::int AS last30,
           COUNT(*) FILTER (WHERE created_at >= ${trendCutoff})::int AS last7
    FROM tag_review_reports
  `);
  return reportTotals;
};

const fetchTagsLive = async ({ trendCutoff }: MetricsCutoffs): Promise<TagsLiveRow> => {
  const [tagsLive = EMPTY_TAGS_LIVE] = await prisma.$queryRaw<TagsLiveRow[]>(Prisma.sql`
    SELECT
      COUNT(*) FILTER (WHERE clp.review_status = 'APPROVED')::int AS current,
      COUNT(*) FILTER (
        WHERE clp.review_status = 'APPROVED' AND ${TAG_APPROVED_AT_SQL} <= ${trendCutoff}
      )::int AS previous
    FROM creator_look_products clp
    JOIN creator_looks cl ON cl.id = clp.creator_look_id
    WHERE ${LOOK_IS_LIVE_SQL}
  `);
  return tagsLive;
};

const fetchManualReviewRate = async ({
  trendCutoff,
  trendPriorCutoff,
}: MetricsCutoffs): Promise<ManualReviewRateRow> => {
  const [manualReviewRate = EMPTY_MANUAL_REVIEW_RATE] = await prisma.$queryRaw<
    ManualReviewRateRow[]
  >(Prisma.sql`
    SELECT
      COUNT(*) FILTER (
        WHERE ${TAG_APPROVED_AT_SQL} >= ${trendCutoff}
      )::int AS current_total,
      COUNT(*) FILTER (
        WHERE ${TAG_APPROVED_AT_SQL} >= ${trendCutoff} AND clp.approval_source = 'BRAND'
      )::int AS current_manual,
      COUNT(*) FILTER (
        WHERE ${TAG_APPROVED_AT_SQL} >= ${trendPriorCutoff}
          AND ${TAG_APPROVED_AT_SQL} < ${trendCutoff}
      )::int AS previous_total,
      COUNT(*) FILTER (
        WHERE ${TAG_APPROVED_AT_SQL} >= ${trendPriorCutoff}
          AND ${TAG_APPROVED_AT_SQL} < ${trendCutoff} AND clp.approval_source = 'BRAND'
      )::int AS previous_manual
    FROM creator_look_products clp
    JOIN creator_looks cl ON cl.id = clp.creator_look_id
    WHERE clp.review_status = 'APPROVED' AND ${LOOK_IS_LIVE_SQL}
  `);
  return manualReviewRate;
};

const fetchMedianTimeToLive = async ({
  trendCutoff,
  trendPriorCutoff,
}: MetricsCutoffs): Promise<MedianTimeToLiveRow> => {
  const [medianTimeToLive = EMPTY_MEDIAN_TIME_TO_LIVE] = await prisma.$queryRaw<
    MedianTimeToLiveRow[]
  >(Prisma.sql`
    WITH first_approved AS (
      SELECT clp.creator_look_id,
             MIN(COALESCE(clp.reviewed_at, clp.submitted_at)) AS approved_at
      FROM creator_look_products clp
      WHERE clp.review_status = 'APPROVED'
      GROUP BY clp.creator_look_id
    )
    SELECT
      COUNT(*) FILTER (WHERE fa.approved_at >= ${trendCutoff})::int AS current_looks,
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
  `);
  return medianTimeToLive;
};

const toReviewLatencyByPolicy = (row: ReviewLatencyRow): ReviewLatencyByPolicy => ({
  policy: row.policy,
  decidedCount: row.decided_count,
  p50Hours: toHours(row.p50),
  p90Hours: toHours(row.p90),
});

const buildOverview = ({
  tagsLive,
  manualReviewRate,
  medianTimeToLive,
  reportTotals,
  stuckApprovalRequiredCount,
}: {
  tagsLive: TagsLiveRow;
  manualReviewRate: ManualReviewRateRow;
  medianTimeToLive: MedianTimeToLiveRow;
  reportTotals: ReportTotalsRow;
  stuckApprovalRequiredCount: number;
}): TagReviewOverview => ({
  tagsLive: toPeriodTrend(tagsLive.current, tagsLive.previous),
  manualReviewRatePercent: toPeriodTrend(
    toManualReviewRatePercent(manualReviewRate.current_total, manualReviewRate.current_manual),
    toManualReviewRatePercent(manualReviewRate.previous_total, manualReviewRate.previous_manual),
  ),
  medianTimeToLiveHours: toPeriodTrend(
    toHours(medianTimeToLive.current_p50),
    toHours(medianTimeToLive.previous_p50),
  ),
  approvedLast7d: {
    total: manualReviewRate.current_total,
    manual: manualReviewRate.current_manual,
  },
  looksLiveLast7d: medianTimeToLive.current_looks,
  openIssues: {
    count: reportTotals.open + stuckApprovalRequiredCount,
    newLast7d: reportTotals.last7,
  },
});

export const tagReviewMetricsRepository = {
  async getMetrics(): Promise<TagReviewMetrics> {
    const cutoffs = buildMetricsCutoffs();

    const [
      reviewLatencyRows,
      approvalSourceRows,
      rejectionReasonRows,
      firstShoppable,
      stuckApprovalRequiredCount,
      waitingCount,
      reportTotals,
      tagsLive,
      manualReviewRate,
      medianTimeToLive,
    ] = await Promise.all([
      fetchReviewLatencyRows(),
      fetchApprovalSourceRows(),
      fetchRejectionReasonRows(),
      fetchFirstShoppableTimes(),
      countStuckApprovalRequiredTags(cutoffs.slaCutoff),
      countWaitingTags(),
      fetchReportTotals(cutoffs),
      fetchTagsLive(cutoffs),
      fetchManualReviewRate(cutoffs),
      fetchMedianTimeToLive(cutoffs),
    ]);

    return {
      overview: buildOverview({
        tagsLive,
        manualReviewRate,
        medianTimeToLive,
        reportTotals,
        stuckApprovalRequiredCount,
      }),
      reviewLatencyByPolicy: reviewLatencyRows.map(toReviewLatencyByPolicy),
      approvalSourceMix: approvalSourceRows.map((row) => ({
        source: row.approval_source,
        count: row.count,
      })),
      rejectionReasonMix: rejectionReasonRows.map((row) => ({
        reason: row.rejection_reason,
        count: row.count,
      })),
      timeToFirstShoppable: {
        looksWithApprovedTag: firstShoppable.looks,
        p50Hours: toHours(firstShoppable.p50),
        p90Hours: toHours(firstShoppable.p90),
      },
      stuckApprovalRequiredCount,
      waitingCount,
      reports: { open: reportTotals.open, last30Days: reportTotals.last30 },
    };
  },
};
