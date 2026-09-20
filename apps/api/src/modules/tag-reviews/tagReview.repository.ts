import { prisma } from "#db/prisma.js";
import { Prisma } from "#generated/prisma/client.js";
import type { TagApprovalSource, TagRejectionReason } from "#generated/prisma/enums.js";
import {
  BrandTagReviewPolicy,
  FulfilmentStatus,
  PaymentStatus,
  TagReviewStatus,
} from "#generated/prisma/enums.js";
import { buildCursorPage, decodeCursor, encodeCursor } from "#lib/pagination.utils.js";

import type {
  BrandReviewBacklog,
  PeriodTrend,
  ReviewableTag,
  ReviewLatencyByPolicy,
  SlaEligibleTag,
  TagReviewMetrics,
  TagReviewQueuePage,
} from "./tagReview.types.js";

const SLA_DECISION_WINDOW_DAYS = 7;
const REPORT_RECENT_WINDOW_DAYS = 30;
const TREND_WINDOW_DAYS = 7;

type QueueCursor = { s: string; i: string };

type QueueSignalRow = {
  id: string;
  creatorLook: { creator: { id: string } };
  product: { id: string; brandId: string };
};

const pairKey = (left: string, right: string): string => `${left}:${right}`;

const resolveQueueSignals = async (
  rows: QueueSignalRow[],
): Promise<Map<string, { isVerifiedBuyer: boolean; isTrustedCreator: boolean }>> => {
  const signalsByTagId = new Map<string, { isVerifiedBuyer: boolean; isTrustedCreator: boolean }>();
  if (rows.length === 0) return signalsByTagId;

  const creatorIds = [...new Set(rows.map((row) => row.creatorLook.creator.id))];
  const productIds = [...new Set(rows.map((row) => row.product.id))];
  const brandIds = [...new Set(rows.map((row) => row.product.brandId))];

  const [purchases, trusts] = await Promise.all([
    prisma.orderItem.findMany({
      where: {
        productId: { in: productIds },
        order: {
          userId: { in: creatorIds },
          paymentStatus: PaymentStatus.PAID,
          fulfilmentStatus: { not: FulfilmentStatus.CANCELLED },
        },
      },
      select: { productId: true, order: { select: { userId: true } } },
    }),
    prisma.brandTrustedCreator.findMany({
      where: { brandId: { in: brandIds }, creatorId: { in: creatorIds } },
      select: { brandId: true, creatorId: true },
    }),
  ]);

  const verifiedBuyerPairs = new Set(
    purchases.map((purchase) => pairKey(purchase.order.userId, purchase.productId)),
  );
  const trustedPairs = new Set(trusts.map((trust) => pairKey(trust.brandId, trust.creatorId)));

  for (const row of rows) {
    const creatorId = row.creatorLook.creator.id;
    signalsByTagId.set(row.id, {
      isVerifiedBuyer: verifiedBuyerPairs.has(pairKey(creatorId, row.product.id)),
      isTrustedCreator: trustedPairs.has(pairKey(row.product.brandId, creatorId)),
    });
  }
  return signalsByTagId;
};

const queueInclude = {
  creatorLook: {
    select: {
      id: true,
      imageUrl: true,
      creator: { select: { id: true, name: true, handle: true } },
    },
  },
  product: { select: { id: true, name: true, imageUrl: true, brandId: true } },
} as const;

export type TagTransitionData = {
  reviewStatus: TagReviewStatus;
  approvalSource?: TagApprovalSource | null;
  reviewedById?: string | null;
  reviewedAt?: Date | null;
  rejectionReason?: TagRejectionReason | null;
  rejectionNote?: string | null;
};

export const tagReviewRepository = {
  async listQueue(
    brandIds: string[],
    { status, cursor, limit }: { status: TagReviewStatus; cursor?: string; limit: number },
  ): Promise<TagReviewQueuePage> {
    if (brandIds.length === 0) return { items: [], nextCursor: null };

    const decoded = decodeCursor<QueueCursor>(cursor);
    const cursorWhere: Prisma.CreatorLookProductWhereInput = decoded
      ? {
          OR: [
            { submittedAt: { lt: new Date(decoded.s) } },
            { AND: [{ submittedAt: new Date(decoded.s) }, { id: { lt: decoded.i } }] },
          ],
        }
      : {};

    const rows = await prisma.creatorLookProduct.findMany({
      where: {
        reviewStatus: status,
        product: { brandId: { in: brandIds } },
        creatorLook: { deletedAt: null },
        ...cursorWhere,
      },
      orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      include: queueInclude,
    });

    const { items: pageRows, nextCursor } = buildCursorPage(rows, limit, (row) =>
      encodeCursor<QueueCursor>({ s: row.submittedAt.toISOString(), i: row.id }),
    );

    const signalsByTagId = await resolveQueueSignals(pageRows);

    return {
      items: pageRows.map((row) => {
        const signals = signalsByTagId.get(row.id);
        return {
          id: row.id,
          lookId: row.creatorLook.id,
          lookImageUrl: row.creatorLook.imageUrl,
          submittedAt: row.submittedAt,
          reviewedAt: row.reviewedAt,
          reviewStatus: row.reviewStatus,
          approvalSource: row.approvalSource,
          rejectionReason: row.rejectionReason,
          rejectionNote: row.rejectionNote,
          reRequestCount: row.reRequestCount,
          sizeWorn: row.sizeWorn,
          isVerifiedBuyer: signals?.isVerifiedBuyer ?? false,
          isTrustedCreator: signals?.isTrustedCreator ?? false,
          creator: row.creatorLook.creator,
          product: row.product,
        };
      }),
      nextCursor,
    };
  },

  async countPending(brandIds: string[]): Promise<number> {
    if (brandIds.length === 0) return 0;
    return prisma.creatorLookProduct.count({
      where: {
        reviewStatus: TagReviewStatus.PENDING,
        product: { brandId: { in: brandIds } },
        creatorLook: { deletedAt: null },
      },
    });
  },

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

  async findReviewableTag(tagId: string, brandIds: string[]): Promise<ReviewableTag | null> {
    const row = await prisma.creatorLookProduct.findFirst({
      where: { id: tagId, product: { brandId: { in: brandIds } } },
      select: {
        id: true,
        reviewStatus: true,
        creatorLookId: true,
        productId: true,
        creatorLook: { select: { creatorId: true } },
        product: { select: { brandId: true } },
      },
    });
    if (!row) return null;
    return {
      id: row.id,
      lookId: row.creatorLookId,
      creatorId: row.creatorLook.creatorId,
      productId: row.productId,
      brandId: row.product.brandId,
      reviewStatus: row.reviewStatus,
    };
  },

  async transitionTag(
    tagId: string,
    fromStatus: TagReviewStatus,
    data: TagTransitionData,
  ): Promise<boolean> {
    const result = await prisma.creatorLookProduct.updateMany({
      where: { id: tagId, reviewStatus: fromStatus },
      data,
    });
    return result.count > 0;
  },

  async findTagForTransition(tagId: string): Promise<{
    id: string;
    lookId: string;
    creatorId: string;
    productId: string;
    reviewStatus: TagReviewStatus;
  } | null> {
    const row = await prisma.creatorLookProduct.findUnique({
      where: { id: tagId },
      select: {
        id: true,
        creatorLookId: true,
        productId: true,
        reviewStatus: true,
        creatorLook: { select: { creatorId: true } },
      },
    });
    if (!row) return null;
    return {
      id: row.id,
      lookId: row.creatorLookId,
      creatorId: row.creatorLook.creatorId,
      productId: row.productId,
      reviewStatus: row.reviewStatus,
    };
  },

  async trustCreator(brandId: string, creatorId: string, grantedById: string): Promise<void> {
    await prisma.brandTrustedCreator.upsert({
      where: { brandId_creatorId: { brandId, creatorId } },
      create: { brandId, creatorId, grantedById },
      update: {},
    });
  },

  async listMemberBrandIds(userId: string): Promise<string[]> {
    const memberships = await prisma.brandMembership.findMany({
      where: { userId },
      select: { brandId: true },
    });
    return memberships.map((membership) => membership.brandId);
  },

  async listSlaEligibleTags(submittedBefore: Date): Promise<SlaEligibleTag[]> {
    const rows = await prisma.creatorLookProduct.findMany({
      where: {
        reviewStatus: TagReviewStatus.PENDING,
        submittedAt: { lt: submittedBefore },
        creatorLook: { deletedAt: null },
        product: {
          brand: {
            tagReviewPolicy: {
              in: [BrandTagReviewPolicy.OPEN, BrandTagReviewPolicy.TRUSTED_ONLY],
            },
          },
        },
      },
      select: {
        id: true,
        productId: true,
        creatorLookId: true,
        creatorLook: { select: { creatorId: true } },
      },
    });
    return rows.map((row) => ({
      id: row.id,
      lookId: row.creatorLookId,
      creatorId: row.creatorLook.creatorId,
      productId: row.productId,
      reviewStatus: TagReviewStatus.PENDING,
    }));
  },

  async listBrandBacklogs(submittedBefore: Date): Promise<BrandReviewBacklog[]> {
    const rows = await prisma.$queryRaw<{ brand_id: string; pending_count: number }[]>(Prisma.sql`
      SELECT p.brand_id, COUNT(*)::int AS pending_count
      FROM creator_look_products clp
      JOIN products p ON p.id = clp.product_id
      JOIN creator_looks cl ON cl.id = clp.creator_look_id
      WHERE clp.review_status = 'PENDING'
        AND clp.submitted_at < ${submittedBefore}
        AND cl.deleted_at IS NULL
      GROUP BY p.brand_id
    `);
    return rows.map((row) => ({ brandId: row.brand_id, pendingCount: row.pending_count }));
  },
};
