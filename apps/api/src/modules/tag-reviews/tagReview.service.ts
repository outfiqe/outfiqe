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

type ApprovableTag = { id: string; lookId: string; creatorId: string; productId: string };

type TransitionableTag = ApprovableTag & { reviewStatus: TagReviewStatus };

export const applyTagRejection = async (
  tag: TransitionableTag,
  {
    reason,
    note,
    reviewedById,
  }: { reason: TagRejectionReason; note: string | null; reviewedById: string },
): Promise<void> => {
  const wasApproved = tag.reviewStatus === TagReviewStatus.APPROVED;

  await tagReviewRepository.transitionTag(tag.id, {
    reviewStatus: TagReviewStatus.REJECTED,
    approvalSource: null,
    reviewedById,
    reviewedAt: new Date(),
    rejectionReason: reason,
    rejectionNote: note,
  });

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
};

export const applyTagApproval = async (
  tag: ApprovableTag,
  { source, reviewedById }: { source: TagApprovalSource; reviewedById: string | null },
): Promise<void> => {
  await tagReviewRepository.transitionTag(tag.id, {
    reviewStatus: TagReviewStatus.APPROVED,
    approvalSource: source,
    reviewedById,
    reviewedAt: new Date(),
    rejectionReason: null,
    rejectionNote: null,
  });

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

    await applyTagApproval(tag, { source: TagApprovalSource.BRAND, reviewedById: userId });
  },

  async rejectTag(userId: string, tagId: string, { reason, note }: RejectTagBody): Promise<void> {
    const tag = await requireReviewableTag(userId, tagId);
    requireTransition(tag.reviewStatus, TagReviewStatus.REJECTED);

    await applyTagRejection(tag, { reason, note: note ?? null, reviewedById: userId });
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
    await applyTagRejection(tag, { reason, note, reviewedById });
    return true;
  },
};
