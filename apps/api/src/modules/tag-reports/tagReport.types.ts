import type {
  TagReportReason,
  TagReportSource,
  TagReportStatus,
  TagReviewStatus,
} from "#generated/prisma/enums.js";

export type TagReportListItem = {
  id: string;
  source: TagReportSource;
  reason: TagReportReason;
  note: string | null;
  status: TagReportStatus;
  createdAt: Date;
  reviewedAt: Date | null;
  resolutionNote: string | null;
  reporterName: string | null;
  tag: {
    id: string;
    lookId: string;
    lookImageUrl: string;
    reviewStatus: TagReviewStatus;
    sizeWorn: string | null;
    product: { id: string; name: string; brandId: string; brandName: string };
    creator: {
      id: string;
      name: string;
      handle: string;
      counterfeitFlagCount: number;
    };
  };
};

export type TagReportPage = {
  items: TagReportListItem[];
  nextCursor: string | null;
};

export type ReportableTag = {
  id: string;
  creatorId: string;
  reviewStatus: TagReviewStatus;
};
