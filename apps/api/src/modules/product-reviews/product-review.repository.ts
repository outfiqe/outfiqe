import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import { FulfilmentStatus } from "#generated/prisma/enums.js";

import type {
  CreateProductReviewInput,
  ListProductReviewsParams,
  ProductReviewRow,
  ReviewSort,
  UpdateProductReviewInput,
} from "./product-review.types.js";

const withAuthorAndImages = {
  user: { select: { id: true, name: true, handle: true, avatarUrl: true } },
  images: { orderBy: { sortOrder: "asc" as const }, select: { url: true } },
};

const SORT_ORDER_BY: Record<ReviewSort, Prisma.ProductReviewOrderByWithRelationInput[]> = {
  newest: [{ createdAt: "desc" }, { id: "desc" }],
  oldest: [{ createdAt: "asc" }, { id: "asc" }],
  highest_rating: [{ rating: "desc" }, { createdAt: "desc" }, { id: "desc" }],
  lowest_rating: [{ rating: "asc" }, { createdAt: "desc" }, { id: "desc" }],
  most_helpful: [{ helpfulCount: "desc" }, { createdAt: "desc" }, { id: "desc" }],
};

export const productReviewRepository = {
  async hasDeliveredPurchase(userId: string, productId: string): Promise<boolean> {
    const deliveredOrderItem = await prisma.orderItem.findFirst({
      where: { productId, order: { userId, fulfilmentStatus: FulfilmentStatus.DELIVERED } },
      select: { id: true },
    });
    return deliveredOrderItem !== null;
  },

  async findByProductAndUser(productId: string, userId: string): Promise<{ id: string } | null> {
    return prisma.productReview.findUnique({
      where: { productId_userId: { productId, userId } },
      select: { id: true },
    });
  },

  async findActiveById(
    reviewId: string,
  ): Promise<{ id: string; productId: string; userId: string } | null> {
    return prisma.productReview.findFirst({
      where: { id: reviewId, deletedAt: null },
      select: { id: true, productId: true, userId: true },
    });
  },

  async list(productId: string, params: ListProductReviewsParams): Promise<ProductReviewRow[]> {
    return prisma.productReview.findMany({
      where: { productId, deletedAt: null, rating: params.rating },
      orderBy: SORT_ORDER_BY[params.sort],
      take: params.limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      include: withAuthorAndImages,
    });
  },

  async findVotedReviewIds(reviewIds: string[], userId: string): Promise<Set<string>> {
    if (reviewIds.length === 0) return new Set();

    const votes = await prisma.productReviewHelpfulVote.findMany({
      where: { userId, reviewId: { in: reviewIds } },
      select: { reviewId: true },
    });
    return new Set(votes.map((vote) => vote.reviewId));
  },

  async create(input: CreateProductReviewInput): Promise<ProductReviewRow> {
    const { imageUrls, ...rest } = input;
    return prisma.productReview.create({
      data: {
        ...rest,
        images: imageUrls.length
          ? { create: imageUrls.map((url, sortOrder) => ({ url, sortOrder })) }
          : undefined,
      },
      include: withAuthorAndImages,
    });
  },

  async update(reviewId: string, input: UpdateProductReviewInput): Promise<ProductReviewRow> {
    const { imageUrls, ...rest } = input;
    return prisma.productReview.update({
      where: { id: reviewId },
      data: {
        ...rest,
        ...(imageUrls
          ? {
              images: {
                deleteMany: {},
                create: imageUrls.map((url, sortOrder) => ({ url, sortOrder })),
              },
            }
          : {}),
      },
      include: withAuthorAndImages,
    });
  },

  async softDelete(reviewId: string): Promise<void> {
    await prisma.productReview.update({ where: { id: reviewId }, data: { deletedAt: new Date() } });
  },

  async vote(reviewId: string, userId: string): Promise<{ helpfulCount: number }> {
    return prisma.$transaction(async (tx) => {
      const { count } = await tx.productReviewHelpfulVote.createMany({
        data: [{ reviewId, userId }],
        skipDuplicates: true,
      });

      const review =
        count > 0
          ? await tx.productReview.update({
              where: { id: reviewId },
              data: { helpfulCount: { increment: 1 } },
            })
          : await tx.productReview.findUniqueOrThrow({ where: { id: reviewId } });

      return { helpfulCount: review.helpfulCount };
    });
  },

  async unvote(reviewId: string, userId: string): Promise<{ helpfulCount: number }> {
    return prisma.$transaction(async (tx) => {
      const deleted = await tx.productReviewHelpfulVote.deleteMany({
        where: { reviewId, userId },
      });
      if (deleted.count === 0) {
        const review = await tx.productReview.findUniqueOrThrow({ where: { id: reviewId } });
        return { helpfulCount: review.helpfulCount };
      }

      const review = await tx.productReview.update({
        where: { id: reviewId },
        data: { helpfulCount: { decrement: 1 } },
      });
      return { helpfulCount: review.helpfulCount };
    });
  },
};
