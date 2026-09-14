import { DomainEvents, eventBus } from "#events/event-bus.js";
import type { TagRejectionReason } from "#generated/prisma/enums.js";
import { TagApprovalSource, TagReviewStatus } from "#generated/prisma/enums.js";
import { canTransitionTagReview } from "#lib/tag-review.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { productService } from "#modules/products/product.service.js";

import { tagReviewRepository } from "./tagReview.repository.js";
import type { ApproveTagBody, ListTagReviewsQuery, RejectTagBody } from "./tagReview.schemas.js";
import type { ReviewableTag, TagReviewMetrics, TagReviewQueuePage } from "./tagReview.types.js";

const NOT_FOUND_STATUS = 404;
const INVALID_TRANSITION_STATUS = 422;
const CONFLICT_STATUS = 409;

const requireReviewableTag = async (userId: string, tagId: string): Promise<ReviewableTag> => {
  const brandIds = await tagReviewRepository.listMemberBrandIds(userId);
  const tag = await tagReviewRepository.findReviewableTag(tagId, brandIds);
  if (!tag) {
    throw new AppError(
      "TAG_REVIEW_NOT_FOUND",
      "This tag review no longer exists.",
      NOT_FOUND_STATUS,
    );
  }
  return tag;
};

const requireTransition = (from: TagReviewStatus, to: TagReviewStatus): void => {
  if (!canTransitionTagReview(from, to)) {
    throw new AppError(
      "TAG_REVIEW_INVALID_TRANSITION",
      "This tag is no longer in a state you can change.",
      INVALID_TRANSITION_STATUS,
    );
  }
};

type TransitionableTag = {
  id: string;
  lookId: string;
  creatorId: string;
  productId: string;
  reviewStatus: TagReviewStatus;
};

export const applyTagRejection = async (
  tag: TransitionableTag,
  {
    reason,
    note,
    reviewedById,
  }: { reason: TagRejectionReason; note: string | null; reviewedById: string },
): Promise<boolean> => {
  const wasApproved = tag.reviewStatus === TagReviewStatus.APPROVED;

  const applied = await tagReviewRepository.transitionTag(tag.id, tag.reviewStatus, {
    reviewStatus: TagReviewStatus.REJECTED,
    approvalSource: null,
    reviewedById,
    reviewedAt: new Date(),
    rejectionReason: reason,
    rejectionNote: note,
  });
  if (!applied) return false;

  if (wasApproved) {
    await productService.recountWornBy(tag.productId);
  }

  await eventBus.publish(
    wasApproved ? DomainEvents.PRODUCT_TAG_REVOKED : DomainEvents.PRODUCT_TAG_REJECTED,
    {
      tagId: tag.id,
      lookId: tag.lookId,
      creatorId: tag.creatorId,
      productId: tag.productId,
      reason,
      note,
    },
  );
  return true;
};

export const applyTagApproval = async (
  tag: TransitionableTag,
  { source, reviewedById }: { source: TagApprovalSource; reviewedById: string | null },
): Promise<boolean> => {
  const applied = await tagReviewRepository.transitionTag(tag.id, tag.reviewStatus, {
    reviewStatus: TagReviewStatus.APPROVED,
    approvalSource: source,
    reviewedById,
    reviewedAt: new Date(),
    rejectionReason: null,
    rejectionNote: null,
  });
  if (!applied) return false;

  await productService.recountWornBy(tag.productId);
  await eventBus.publish(DomainEvents.PRODUCT_TAGGED, {
    lookId: tag.lookId,
    creatorId: tag.creatorId,
    productId: tag.productId,
  });
  await eventBus.publish(DomainEvents.PRODUCT_TAG_APPROVED, {
    tagId: tag.id,
    lookId: tag.lookId,
    creatorId: tag.creatorId,
    productId: tag.productId,
    auto: source !== TagApprovalSource.BRAND,
  });
  return true;
};

const requireAppliedTransition = (applied: boolean): void => {
  if (applied) return;
  throw new AppError(
    "TAG_REVIEW_ALREADY_RESOLVED",
    "Someone already reviewed this tag — refresh to see its current status.",
    CONFLICT_STATUS,
  );
};

export const tagReviewService = {
  async listQueue(userId: string, query: ListTagReviewsQuery): Promise<TagReviewQueuePage> {
    const brandIds = await tagReviewRepository.listMemberBrandIds(userId);
    return tagReviewRepository.listQueue(brandIds, query);
  },

  async countPending(userId: string): Promise<{ pendingCount: number }> {
    const brandIds = await tagReviewRepository.listMemberBrandIds(userId);
    return { pendingCount: await tagReviewRepository.countPending(brandIds) };
  },

  getMetrics(): Promise<TagReviewMetrics> {
    return tagReviewRepository.getMetrics();
  },

  async approveTag(userId: string, tagId: string, { trustCreator }: ApproveTagBody): Promise<void> {
    const tag = await requireReviewableTag(userId, tagId);
    requireTransition(tag.reviewStatus, TagReviewStatus.APPROVED);

    if (trustCreator) {
      await tagReviewRepository.trustCreator(tag.brandId, tag.creatorId, userId);
    }

    const applied = await applyTagApproval(tag, {
      source: TagApprovalSource.BRAND,
      reviewedById: userId,
    });
    requireAppliedTransition(applied);
  },

  async rejectTag(userId: string, tagId: string, { reason, note }: RejectTagBody): Promise<void> {
    const tag = await requireReviewableTag(userId, tagId);
    requireTransition(tag.reviewStatus, TagReviewStatus.REJECTED);

    const applied = await applyTagRejection(tag, {
      reason,
      note: note ?? null,
      reviewedById: userId,
    });
    requireAppliedTransition(applied);
  },

  async takeDownTagAsPlatform(
    tagId: string,
    reviewedById: string,
    { reason, note }: { reason: TagRejectionReason; note: string | null },
  ): Promise<boolean> {
    const tag = await tagReviewRepository.findTagForTransition(tagId);
    if (!tag || !canTransitionTagReview(tag.reviewStatus, TagReviewStatus.REJECTED)) {
      return false;
    }
    return applyTagRejection(tag, { reason, note, reviewedById });
  },
};
