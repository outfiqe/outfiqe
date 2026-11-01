import { DomainEvents, eventBus } from "#events/event-bus.js";
import type { TagRejectionReason } from "#generated/prisma/enums.js";
import { TagApprovalSource, TagReviewStatus } from "#generated/prisma/enums.js";
import { canTransitionTagReview } from "#lib/tag-review.utils.js";
import { productService } from "#modules/products/product.service.js";

import { tagReviewErrors } from "./tag-review.errors.js";
import { tagReviewRepository } from "./tag-review.repository.js";
import type {
  ApproveTagBody,
  ListMetricTagsQuery,
  ListTagReviewsQuery,
  RejectTagBody,
} from "./tag-review.schemas.js";
import type {
  ReviewableTag,
  TagReviewMetrics,
  TagReviewMetricTagPage,
  TagReviewQueuePage,
  TransitionableTag,
} from "./tag-review.types.js";

type TagRejection = { reason: TagRejectionReason; note: string | null };

const requireReviewableTag = async (userId: string, tagId: string): Promise<ReviewableTag> => {
  const brandIds = await tagReviewRepository.listMemberBrandIds(userId);
  const tag = await tagReviewRepository.findReviewableTag(tagId, brandIds);
  if (!tag) throw tagReviewErrors.notFound();
  return tag;
};

const requireTransition = (from: TagReviewStatus, to: TagReviewStatus): void => {
  if (!canTransitionTagReview(from, to)) throw tagReviewErrors.invalidTransition();
};

const requireAppliedTransition = (applied: boolean): void => {
  if (!applied) throw tagReviewErrors.alreadyResolved();
};

const publishTagRejectionEffects = async (
  tag: TransitionableTag,
  wasApproved: boolean,
  { reason, note }: TagRejection,
): Promise<void> => {
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

const publishTagApprovalEffects = async (
  tag: TransitionableTag,
  source: TagApprovalSource,
): Promise<void> => {
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

export const applyTagRejection = async (
  tag: TransitionableTag,
  { reason, note, reviewedById }: TagRejection & { reviewedById: string },
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

  if (applied) await publishTagRejectionEffects(tag, wasApproved, { reason, note });
  return applied;
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

  if (applied) await publishTagApprovalEffects(tag, source);
  return applied;
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

  listMetricTags(query: ListMetricTagsQuery): Promise<TagReviewMetricTagPage> {
    return tagReviewRepository.listMetricTags(query);
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
    { reason, note }: TagRejection,
  ): Promise<boolean> {
    const tag = await tagReviewRepository.findTagForTransition(tagId);
    const canTakeDown =
      tag !== null && canTransitionTagReview(tag.reviewStatus, TagReviewStatus.REJECTED);
    return canTakeDown && applyTagRejection(tag, { reason, note, reviewedById });
  },
};
