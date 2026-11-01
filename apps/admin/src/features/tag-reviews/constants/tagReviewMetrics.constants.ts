import type {
  TagApprovalSourceValue,
  TagPolicy,
  TagRejectionReasonValue,
} from "../api/tagReviewsSchemas";

export const POLICY_LABEL: Record<TagPolicy, string> = {
  OPEN: "Open to all",
  TRUSTED_ONLY: "Trusted only",
  APPROVAL_REQUIRED: "Review every tag",
};

export const POLICY_EXPLANATION: Record<TagPolicy, string> = {
  OPEN: "This brand lets every tag go live without checking.",
  TRUSTED_ONLY: "This brand lets its trusted muses through and checks everyone else.",
  APPROVAL_REQUIRED: "This brand checks every tag by hand.",
};

export const SOURCE_LABEL: Record<TagApprovalSourceValue, string> = {
  BRAND: "Checked by the brand",
  POLICY_OPEN: "Brand accepts all tags",
  TRUSTED_CREATOR: "Trusted muse",
  VERIFIED_BUYER: "Muse bought the product",
  SLA: "Brand didn't reply in 7 days",
  GRANDFATHERED: "From before reviews started",
};

export const SOURCE_EXPLANATION: Record<TagApprovalSourceValue, string> = {
  BRAND: "Someone at the brand looked at the tag and said yes.",
  POLICY_OPEN: "Went live straight away because the brand accepts every tag.",
  TRUSTED_CREATOR: "Went live straight away because the brand trusts this muse.",
  VERIFIED_BUYER: "Went live straight away because the muse really bought this product.",
  SLA: "The brand didn't answer within 7 days, so the tag went live on its own.",
  GRANDFATHERED: "This tag was already live when tag reviews started, so nobody checked it.",
};

type SourceGroup = { title: string; sources: TagApprovalSourceValue[] };

export const SOURCE_GROUP_COLUMNS: SourceGroup[][] = [
  [
    { title: "Checked by a person", sources: ["BRAND"] },
    { title: "Older tags", sources: ["GRANDFATHERED"] },
  ],
  [
    {
      title: "Approved automatically",
      sources: ["POLICY_OPEN", "TRUSTED_CREATOR", "VERIFIED_BUYER", "SLA"],
    },
  ],
];

export const REASON_LABEL: Record<TagRejectionReasonValue, string> = {
  NOT_OUR_PRODUCT: "Not the brand's product",
  COUNTERFEIT_SUSPECTED: "Looks like a fake",
  MISREPRESENTS_PRODUCT: "Shows the product wrongly",
  POLICY_VIOLATION: "Breaks the rules",
  OTHER: "Other",
};

export const TIME_TO_GO_LIVE_TARGET_HOURS = 72;
export const BRAND_DECISION_TARGET_HOURS = 24;
export const MIN_SAMPLE_TO_JUDGE = 5;
export const TREND_WINDOW_LABEL = "vs. the 7 days before";
