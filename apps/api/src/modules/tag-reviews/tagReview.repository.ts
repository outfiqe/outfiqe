import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import type {
  TagApprovalSource,
  TagRejectionReason,
  TagReviewStatus,
} from "#generated/prisma/enums.js";
import { buildCursorPage, decodeCursor, encodeCursor } from "#lib/pagination.utils.js";

import type { ReviewableTag, TagReviewQueuePage } from "./tagReview.types.js";

type QueueCursor = { s: string; i: string };

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

    return {
      items: pageRows.map((row) => ({
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
        creator: row.creatorLook.creator,
        product: row.product,
      })),
      nextCursor,
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
};
