import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import { FulfilmentStatus, PaymentStatus, TagReviewStatus } from "#generated/prisma/enums.js";
import {
  buildCursorPage,
  decodeCursor,
  encodeCursor,
  NEXT_PAGE_PROBE_ROWS,
} from "#lib/pagination.utils.js";

import type { TagReviewQueueItem, TagReviewQueuePage } from "../tag-review.types.js";

type QueueCursor = { s: string; i: string };

type QueueSignals = { isVerifiedBuyer: boolean; isTrustedCreator: boolean };

type QueueSignalRow = {
  id: string;
  creatorLook: { creator: { id: string } };
  product: { id: string; brandId: string };
};

const NO_QUEUE_SIGNALS: QueueSignals = { isVerifiedBuyer: false, isTrustedCreator: false };

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

type QueueRow = Prisma.CreatorLookProductGetPayload<{ include: typeof queueInclude }>;

const pairKey = (left: string, right: string): string => `${left}:${right}`;

const resolveQueueSignals = async (rows: QueueSignalRow[]): Promise<Map<string, QueueSignals>> => {
  const signalsByTagId = new Map<string, QueueSignals>();
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

const buildQueueCursorWhere = (cursor?: string): Prisma.CreatorLookProductWhereInput => {
  const decodedCursor = decodeCursor<QueueCursor>(cursor);
  if (!decodedCursor) return {};

  const { s: cursorSubmittedAt, i: cursorTagId } = decodedCursor;
  return {
    OR: [
      { submittedAt: { lt: new Date(cursorSubmittedAt) } },
      { AND: [{ submittedAt: new Date(cursorSubmittedAt) }, { id: { lt: cursorTagId } }] },
    ],
  };
};

const toQueueItem = (row: QueueRow, signals: QueueSignals): TagReviewQueueItem => ({
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
  isVerifiedBuyer: signals.isVerifiedBuyer,
  isTrustedCreator: signals.isTrustedCreator,
  creator: row.creatorLook.creator,
  product: row.product,
});

export const tagReviewQueueRepository = {
  async listQueue(
    brandIds: string[],
    { status, cursor, limit }: { status: TagReviewStatus; cursor?: string; limit: number },
  ): Promise<TagReviewQueuePage> {
    if (brandIds.length === 0) return { items: [], nextCursor: null };

    const rows = await prisma.creatorLookProduct.findMany({
      where: {
        reviewStatus: status,
        product: { brandId: { in: brandIds } },
        creatorLook: { deletedAt: null },
        ...buildQueueCursorWhere(cursor),
      },
      orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
      take: limit + NEXT_PAGE_PROBE_ROWS,
      include: queueInclude,
    });

    const { items: pageRows, nextCursor } = buildCursorPage(rows, limit, (row) =>
      encodeCursor<QueueCursor>({ s: row.submittedAt.toISOString(), i: row.id }),
    );

    const signalsByTagId = await resolveQueueSignals(pageRows);

    return {
      items: pageRows.map((row) =>
        toQueueItem(row, signalsByTagId.get(row.id) ?? NO_QUEUE_SIGNALS),
      ),
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
