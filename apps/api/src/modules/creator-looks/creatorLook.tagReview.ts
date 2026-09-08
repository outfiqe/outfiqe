import {
  BrandTagReviewPolicy,
  TagApprovalSource,
  TagReviewStatus,
} from "#generated/prisma/enums.js";

import { TAG_REVIEW_TRANSITIONS } from "./creatorLook.constants.js";

export type ResolvedTagReviewStatus = {
  reviewStatus: TagReviewStatus;
  approvalSource: TagApprovalSource | null;
};

type ResolveTagReviewStatusInput = {
  featureEnabled: boolean;
  brandPolicy: BrandTagReviewPolicy;
  autoApproveVerifiedBuyers: boolean;
  isVerifiedBuyer: boolean;
  isTrustedCreator: boolean;
};

const approvedFrom = (approvalSource: TagApprovalSource): ResolvedTagReviewStatus => ({
  reviewStatus: TagReviewStatus.APPROVED,
  approvalSource,
});

export const resolveTagReviewStatus = ({
  featureEnabled,
  brandPolicy,
  autoApproveVerifiedBuyers,
  isVerifiedBuyer,
  isTrustedCreator,
}: ResolveTagReviewStatusInput): ResolvedTagReviewStatus => {
  if (!featureEnabled) return approvedFrom(TagApprovalSource.POLICY_OPEN);

  if (isVerifiedBuyer && autoApproveVerifiedBuyers) {
    return approvedFrom(TagApprovalSource.VERIFIED_BUYER);
  }
  if (brandPolicy === BrandTagReviewPolicy.OPEN) {
    return approvedFrom(TagApprovalSource.POLICY_OPEN);
  }
  if (brandPolicy === BrandTagReviewPolicy.TRUSTED_ONLY && isTrustedCreator) {
    return approvedFrom(TagApprovalSource.TRUSTED_CREATOR);
  }

  return { reviewStatus: TagReviewStatus.PENDING, approvalSource: null };
};

export const canTransitionTagReview = (from: TagReviewStatus, to: TagReviewStatus): boolean =>
  TAG_REVIEW_TRANSITIONS[from].includes(to);
