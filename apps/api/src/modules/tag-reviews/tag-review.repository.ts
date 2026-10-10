import { prisma } from "#db/prisma.js";
import { Prisma } from "#generated/prisma/client.js";
import type { TagApprovalSource, TagRejectionReason } from "#generated/prisma/enums.js";
import { BrandTagReviewPolicy, TagReviewStatus } from "#generated/prisma/enums.js";

import { tagReviewMetricsRepository } from "./metrics/metrics.repository.js";
import { tagReviewQueueRepository } from "./queue/queue.repository.js";
import type { BrandReviewBacklog, ReviewableTag, SlaEligibleTag } from "./tag-review.types.js";

export type TagTransitionData = {
  reviewStatus: TagReviewStatus;
  approvalSource?: TagApprovalSource | null;
  reviewedById?: string | null;
  reviewedAt?: Date | null;
  rejectionReason?: TagRejectionReason | null;
  rejectionNote?: string | null;
};

export const tagReviewRepository = {
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

  ...tagReviewQueueRepository,

  ...tagReviewMetricsRepository,
};
