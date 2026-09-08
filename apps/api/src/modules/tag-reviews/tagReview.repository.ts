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
  ReviewableTag,
  SlaEligibleTag,
  TagReviewQueuePage,
} from "./tagReview.types.js";

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

  async transitionTag(tagId: string, data: TagTransitionData): Promise<void> {
    await prisma.creatorLookProduct.update({ where: { id: tagId }, data });
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
