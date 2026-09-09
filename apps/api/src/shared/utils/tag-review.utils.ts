import type { TagReviewStatus } from "#generated/prisma/enums.js";

const TAG_REVIEW_TRANSITIONS: Record<TagReviewStatus, readonly TagReviewStatus[]> = {
  PENDING: ["APPROVED", "REJECTED"],
  APPROVED: ["REJECTED"],
  REJECTED: ["PENDING"],
};

export const canTransitionTagReview = (from: TagReviewStatus, to: TagReviewStatus): boolean =>
  TAG_REVIEW_TRANSITIONS[from].includes(to);
