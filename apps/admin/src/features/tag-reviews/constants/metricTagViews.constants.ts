import type {
  TagApprovalSourceValue,
  TagPolicy,
  TagRejectionReasonValue,
} from "../api/tagReviewsSchemas";

export const METRIC_TAG_VIEW = {
  LIVE: "LIVE",
  APPROVED_THIS_WEEK: "APPROVED_THIS_WEEK",
  WAITING: "WAITING",
  STUCK: "STUCK",
  REJECTED: "REJECTED",
  BRAND_DECISIONS: "BRAND_DECISIONS",
  FIRST_LIVE: "FIRST_LIVE",
  FIRST_LIVE_THIS_WEEK: "FIRST_LIVE_THIS_WEEK",
} as const;

export type MetricTagView = (typeof METRIC_TAG_VIEW)[keyof typeof METRIC_TAG_VIEW];

export type MetricTagsSearch = {
  view: MetricTagView;
  source?: TagApprovalSourceValue;
  reason?: TagRejectionReasonValue;
  policy?: TagPolicy;
};

export const METRIC_TAG_VIEW_COPY: Record<
  MetricTagView,
  { chip: string; title: string; description: string; emptyMessage: string }
> = {
  LIVE: {
    chip: "Live",
    title: "Live tags",
    description: "Tags shoppers can use right now. Newest first.",
    emptyMessage: "No tags are live yet.",
  },
  APPROVED_THIS_WEEK: {
    chip: "Approved this week",
    title: "Approved in the last 7 days",
    description: "Every tag approved in the last 7 days, by a brand or automatically.",
    emptyMessage: "No tags were approved in the last 7 days.",
  },
  WAITING: {
    chip: "Waiting",
    title: "Waiting for a brand",
    description: "Tags a brand hasn't answered yet. The longest wait comes first.",
    emptyMessage: "No tags are waiting. Every brand is up to date.",
  },
  STUCK: {
    chip: "Stuck",
    title: "Stuck for over 7 days",
    description:
      "These brands check every tag, so these tags stay hidden until the brand answers. The longest wait comes first.",
    emptyMessage: "Nothing is stuck.",
  },
  REJECTED: {
    chip: "Rejected",
    title: "Rejected tags",
    description: "Tags a brand turned down. Newest first.",
    emptyMessage: "No tags have been rejected.",
  },
  BRAND_DECISIONS: {
    chip: "Brand decisions",
    title: "Decided by a brand",
    description: "Tags a person at the brand approved or rejected. The slowest answer comes first.",
    emptyMessage: "No brand has decided on a tag yet.",
  },
  FIRST_LIVE: {
    chip: "First live tag",
    title: "Looks with a live tag",
    description: "The first tag to go live on each look. The slowest look comes first.",
    emptyMessage: "No look has a live tag yet.",
  },
  FIRST_LIVE_THIS_WEEK: {
    chip: "Went live this week",
    title: "Looks that went live in the last 7 days",
    description: "Looks that got their first live tag this week. The slowest look comes first.",
    emptyMessage: "No look got its first live tag in the last 7 days.",
  },
};

export const METRIC_TAG_VIEW_ORDER = Object.values(METRIC_TAG_VIEW);
