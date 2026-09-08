import type {
  BrandTagReviewPolicy,
  TagApprovalSource,
  TagRejectionReason,
  TagReviewStatus,
} from "#generated/prisma/enums.js";

export type TagReviewQueueItem = {
  id: string;
  lookId: string;
  lookImageUrl: string;
  submittedAt: Date;
  reviewedAt: Date | null;
  reviewStatus: TagReviewStatus;
  approvalSource: TagApprovalSource | null;
  rejectionReason: TagRejectionReason | null;
  rejectionNote: string | null;
  reRequestCount: number;
  sizeWorn: string | null;
  isVerifiedBuyer: boolean;
  isTrustedCreator: boolean;
  creator: { id: string; name: string; handle: string };
  product: { id: string; name: string; imageUrl: string | null; brandId: string };
};

export type TagReviewQueuePage = {
  items: TagReviewQueueItem[];
  nextCursor: string | null;
};

export type ReviewableTag = {
  id: string;
  lookId: string;
  creatorId: string;
  productId: string;
  brandId: string;
  reviewStatus: TagReviewStatus;
};

export type SlaEligibleTag = {
  id: string;
  lookId: string;
  creatorId: string;
  productId: string;
};

export type BrandReviewBacklog = {
  brandId: string;
  pendingCount: number;
};

export type ReviewLatencyByPolicy = {
  policy: BrandTagReviewPolicy;
  decidedCount: number;
  p50Hours: number | null;
  p90Hours: number | null;
};

export type TagReviewMetrics = {
  reviewLatencyByPolicy: ReviewLatencyByPolicy[];
  approvalSourceMix: { source: TagApprovalSource; count: number }[];
  rejectionReasonMix: { reason: TagRejectionReason; count: number }[];
  timeToFirstShoppable: {
    looksWithApprovedTag: number;
    p50Hours: number | null;
    p90Hours: number | null;
  };
  stuckApprovalRequiredCount: number;
  reports: { open: number; last30Days: number };
};
