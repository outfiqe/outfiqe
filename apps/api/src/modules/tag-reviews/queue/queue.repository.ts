import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import { FulfilmentStatus, PaymentStatus, TagReviewStatus } from "#generated/prisma/enums.js";
import { buildCursorPage, decodeCursor, encodeCursor } from "#lib/pagination.utils.js";

import type { TagReviewQueuePage } from "../tag-review.types.js";

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

export const tagReviewQueueRepository = {
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
};
