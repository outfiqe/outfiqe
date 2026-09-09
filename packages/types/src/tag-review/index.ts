export type TagReviewStatus = "PENDING" | "APPROVED" | "REJECTED";

export type TagApprovalSource =
  "BRAND" | "POLICY_OPEN" | "TRUSTED_CREATOR" | "VERIFIED_BUYER" | "SLA" | "GRANDFATHERED";

export type TagRejectionReason =
  | "NOT_OUR_PRODUCT"
  | "COUNTERFEIT_SUSPECTED"
  | "MISREPRESENTS_PRODUCT"
  | "POLICY_VIOLATION"
  | "OTHER";

export type BrandTagReviewPolicy = "OPEN" | "TRUSTED_ONLY" | "APPROVAL_REQUIRED";

export type TagReportSource = "PUBLIC_REPORT" | "BRAND_COUNTERFEIT_REJECTION";

export type TagReportReason =
  "COUNTERFEIT" | "NOT_GENUINELY_WORN" | "MISLEADING" | "OFFENSIVE" | "OTHER";

export type TagReportStatus = "OPEN" | "ACTIONED" | "DISMISSED";
