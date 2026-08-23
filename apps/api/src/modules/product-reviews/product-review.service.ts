import { DomainEvents, eventBus } from "#events/event-bus.js";
import { UserRole } from "#generated/prisma/enums.js";
import { buildCursorPage } from "#lib/pagination.utils.js";
import { isUniqueConstraintError } from "#lib/prisma.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { productRepository } from "#modules/products/product.repository.js";
import { productService } from "#modules/products/product.service.js";

import { productReviewRepository } from "./product-review.repository.js";
import type { ListProductReviewsQuery, WriteProductReviewBody } from "./product-review.schemas.js";
import type { ProductReviewPage, ProductReviewRecord } from "./product-review.types.js";
import { toReviewRecord } from "./product-review.utils.js";

const NOT_FOUND_STATUS = 404;
const FORBIDDEN_STATUS = 403;
const CONFLICT_STATUS = 409;

const requireActiveProduct = async (productId: string): Promise<void> => {
  const product = await productRepository.findById(productId);
  if (!product || product.deletedAt) {
    throw new AppError("PRODUCT_NOT_FOUND", "Product not found.", NOT_FOUND_STATUS);
  }
};

const throwReviewAlreadyExists = (): never => {
  throw new AppError(
    "REVIEW_ALREADY_EXISTS",
    "You've already reviewed this product. Edit your existing review instead.",
    CONFLICT_STATUS,
  );
};

const requireOwnedReview = async (
  productId: string,
  reviewId: string,
  userId: string,
): Promise<void> => {
  const review = await productReviewRepository.findActiveById(reviewId);
  if (!review || review.productId !== productId) {
    throw new AppError("REVIEW_NOT_FOUND", "This review no longer exists.", NOT_FOUND_STATUS);
  }
  if (review.userId !== userId) {
    throw new AppError("FORBIDDEN", "You can only edit your own review.", FORBIDDEN_STATUS);
  }
};

export const productReviewService = {
  async list(
    productId: string,
    viewerId: string | undefined,
    query: ListProductReviewsQuery,
  ): Promise<ProductReviewPage> {
    await requireActiveProduct(productId);

    const rows = await productReviewRepository.list(productId, query);
    const { items, nextCursor } = buildCursorPage(rows, query.limit, (row) => row.id);

    const votedReviewIds = viewerId
      ? await productReviewRepository.findVotedReviewIds(
          items.map((item) => item.id),
          viewerId,
        )
      : new Set<string>();

    return { reviews: items.map((item) => toReviewRecord(item, votedReviewIds)), nextCursor };
  },

  async create(
    productId: string,
    userId: string,
    { rating, title, body, imageUrls }: WriteProductReviewBody,
  ): Promise<ProductReviewRecord> {
    await requireActiveProduct(productId);

    const hasPurchased = await productReviewRepository.hasDeliveredPurchase(userId, productId);
    if (!hasPurchased) {
      throw new AppError(
        "PURCHASE_REQUIRED",
        "Only customers who have received this product can leave a review.",
        FORBIDDEN_STATUS,
      );
    }

    const existing = await productReviewRepository.findByProductAndUser(productId, userId);
    if (existing) throwReviewAlreadyExists();

    let review;
    try {
      review = await productReviewRepository.create({
        productId,
        userId,
        rating,
        title,
        body,
        imageUrls: imageUrls ?? [],
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) throwReviewAlreadyExists();
      throw error;
    }
    await productService.recomputeRatingSummary(productId);

    await eventBus.publish(DomainEvents.PRODUCT_REVIEWED, {
      productId,
      reviewId: review.id,
      userId,
      rating,
    });

    return toReviewRecord(review, new Set());
  },

  async update(
    productId: string,
    reviewId: string,
    userId: string,
    { rating, title, body, imageUrls }: WriteProductReviewBody,
  ): Promise<ProductReviewRecord> {
    await requireOwnedReview(productId, reviewId, userId);

    const review = await productReviewRepository.update(reviewId, {
      rating,
      title,
      body,
      imageUrls,
    });
    await productService.recomputeRatingSummary(productId);

    const votedReviewIds = await productReviewRepository.findVotedReviewIds([reviewId], userId);
    return toReviewRecord(review, votedReviewIds);
  },

  async remove(
    productId: string,
    reviewId: string,
    principal: { userId: string; role: UserRole },
  ): Promise<void> {
    const review = await productReviewRepository.findActiveById(reviewId);
    if (!review || review.productId !== productId) {
      throw new AppError("REVIEW_NOT_FOUND", "This review no longer exists.", NOT_FOUND_STATUS);
    }

    const isOwner = review.userId === principal.userId;
    const isAdmin = principal.role === UserRole.ADMIN;
    if (!isOwner && !isAdmin) {
      throw new AppError("FORBIDDEN", "You can only delete your own review.", FORBIDDEN_STATUS);
    }

    await productReviewRepository.softDelete(reviewId);
    await productService.recomputeRatingSummary(productId);
  },

  async markHelpful(
    productId: string,
    reviewId: string,
    userId: string,
  ): Promise<{ helpfulCount: number }> {
    const review = await productReviewRepository.findActiveById(reviewId);
    if (!review || review.productId !== productId) {
      throw new AppError("REVIEW_NOT_FOUND", "This review no longer exists.", NOT_FOUND_STATUS);
    }
    if (review.userId === userId) {
      throw new AppError(
        "CANNOT_VOTE_OWN_REVIEW",
        "You can't mark your own review as helpful.",
        FORBIDDEN_STATUS,
      );
    }

    return productReviewRepository.vote(reviewId, userId);
  },

  async unmarkHelpful(
    productId: string,
    reviewId: string,
    userId: string,
  ): Promise<{ helpfulCount: number }> {
    const review = await productReviewRepository.findActiveById(reviewId);
    if (!review || review.productId !== productId) {
      throw new AppError("REVIEW_NOT_FOUND", "This review no longer exists.", NOT_FOUND_STATUS);
    }

    return productReviewRepository.unvote(reviewId, userId);
  },
};
