import type { TagReviewMetrics } from "../api/tagReviewsSchemas";

export const POLICY_LABEL: Record<
  TagReviewMetrics["reviewLatencyByPolicy"][number]["policy"],
  string
> = {
  OPEN: "Open to all",
  TRUSTED_ONLY: "Trusted only",
  APPROVAL_REQUIRED: "Review every tag",
};

export const SOURCE_LABEL: Record<TagReviewMetrics["approvalSourceMix"][number]["source"], string> =
  {
    BRAND: "Brand approved",
    POLICY_OPEN: "Auto — open policy",
    TRUSTED_CREATOR: "Auto — trusted muse",
    VERIFIED_BUYER: "Auto — verified buyer",
    SLA: "Auto — SLA lapsed",
    GRANDFATHERED: "Legacy approval",
  };

export const AUTO_SOURCES = ["POLICY_OPEN", "TRUSTED_CREATOR", "VERIFIED_BUYER", "SLA"] as const;

export const REASON_LABEL: Record<
  TagReviewMetrics["rejectionReasonMix"][number]["reason"],
  string
> = {
  NOT_OUR_PRODUCT: "Not our product",
  COUNTERFEIT_SUSPECTED: "Counterfeit suspected",
  MISREPRESENTS_PRODUCT: "Misrepresents product",
  POLICY_VIOLATION: "Policy violation",
  OTHER: "Other",
};

export const MEDIAN_TIME_TO_LIVE_TARGET_HOURS = 72;
export const BRAND_LATENCY_TARGET_HOURS = 24;
export const TREND_WINDOW_LABEL = "vs. prior 7d";

export const LEGACY_APPROVAL_HINT =
  "Approved before the tag review system existed — no manual or automatic check was applied.";
export const SLA_LAPSED_HINT =
  "The brand didn't act within the 7-day review window, so the tag auto-approved under the platform's SLA instead of waiting on the brand forever.";
export const PERCENTILE_HINT =
  "p50 (median) is the typical case — half of decisions were faster, half slower. p90 shows the slow tail: 90% of decisions finished within this time.";
export const TRUSTED_CREATOR_HINT =
  "The brand has explicitly marked this muse as trusted, so future tags from them skip the review queue.";

export const APPROVAL_MIX_CATEGORY_KEY = "bucket";
