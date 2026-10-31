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

export type TransitionableTag = {
  id: string;
  lookId: string;
  creatorId: string;
  productId: string;
  reviewStatus: TagReviewStatus;
};

export type ReviewableTag = TransitionableTag & { brandId: string };

export type SlaEligibleTag = TransitionableTag;

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

export type PeriodTrend = {
  value: number | null;
  previousValue: number | null;
  deltaPercent: number | null;
};

export type TagReviewOverview = {
  tagsLive: PeriodTrend;
  manualReviewRatePercent: PeriodTrend;
  medianTimeToLiveHours: PeriodTrend;
  approvedLast7d: { total: number; manual: number };
  looksLiveLast7d: number;
  openIssues: { count: number; newLast7d: number };
};

export type TagReviewMetrics = {
  overview: TagReviewOverview;
  reviewLatencyByPolicy: ReviewLatencyByPolicy[];
  approvalSourceMix: { source: TagApprovalSource; count: number }[];
  rejectionReasonMix: { reason: TagRejectionReason; count: number }[];
  timeToFirstShoppable: {
    looksWithApprovedTag: number;
    p50Hours: number | null;
    p90Hours: number | null;
  };
  stuckApprovalRequiredCount: number;
  waitingCount: number;
  reports: { open: number; last30Days: number };
};

export type TagReviewMetricTag = {
  id: string;
  reviewStatus: TagReviewStatus;
  approvalSource: TagApprovalSource | null;
  rejectionReason: TagRejectionReason | null;
  rejectionNote: string | null;
  reRequestCount: number;
  sizeWorn: string | null;
  reportCount: number;
  submittedAt: Date;
  decidedAt: Date | null;
  reviewerName: string | null;
  waitHours: number;
  hoursToGoLive: number | null;
  look: { id: string; imageUrl: string; caption: string | null; postedAt: Date };
  creator: { id: string; name: string; handle: string };
  product: { id: string; name: string; imageUrl: string | null };
  brand: { id: string; name: string; policy: BrandTagReviewPolicy };
};

export type TagReviewMetricTagPage = {
  items: TagReviewMetricTag[];
  nextCursor: string | null;
  totalCount: number;
};
