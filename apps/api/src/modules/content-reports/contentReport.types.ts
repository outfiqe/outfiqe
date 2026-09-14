import type {
  ContentReportReason,
  ContentReportStatus,
  ContentReportTarget,
} from "#generated/prisma/enums.js";

export type ReportableTarget = {
  authorId: string;
};

export type ContentReportTargetPreview = {
  lookId: string;
  imageUrl: string | null;
  snippet: string;
  isRemoved: boolean;
  author: {
    id: string;
    name: string;
    handle: string;
    contentFlagCount: number;
  };
};

export type ContentReportListItem = {
  id: string;
  targetType: ContentReportTarget;
  targetId: string;
  reason: ContentReportReason;
  note: string | null;
  status: ContentReportStatus;
  createdAt: Date;
  resolvedAt: Date | null;
  resolutionNote: string | null;
  reporterName: string | null;
  target: ContentReportTargetPreview | null;
};

export type ContentReportPage = {
  items: ContentReportListItem[];
  nextCursor: string | null;
};

export type ResolvableContentReport = {
  id: string;
  status: ContentReportStatus;
  targetType: ContentReportTarget;
  targetId: string;
};
