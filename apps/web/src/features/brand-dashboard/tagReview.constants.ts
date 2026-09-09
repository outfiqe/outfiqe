import type {
  BrandTagReviewPolicyValue,
  TagRejectionReasonValue,
  TagReviewStatusValue,
} from "./api/tagReviewSchemas";

export const TAG_REVIEW_QUEUE_TABS: { status: TagReviewStatusValue; label: string }[] = [
  { status: "PENDING", label: "Waiting" },
  { status: "APPROVED", label: "Approved" },
  { status: "REJECTED", label: "Declined" },
];

export const TAG_REJECTION_REASON_OPTIONS: { value: TagRejectionReasonValue; label: string }[] = [
  { value: "NOT_OUR_PRODUCT", label: "This isn't one of our products" },
  { value: "COUNTERFEIT_SUSPECTED", label: "This looks like a counterfeit" },
  { value: "MISREPRESENTS_PRODUCT", label: "The look misrepresents the product" },
  { value: "POLICY_VIOLATION", label: "It breaks our tagging policy" },
  { value: "OTHER", label: "Other (add a note)" },
];

export const BRAND_TAG_POLICY_OPTIONS: {
  value: BrandTagReviewPolicyValue;
  label: string;
  description: string;
}[] = [
  {
    value: "TRUSTED_ONLY",
    label: "Trusted creators only",
    description:
      "Creators you've worked with before or who've bought from you get tagged automatically. Everyone else waits for your review.",
  },
  {
    value: "APPROVAL_REQUIRED",
    label: "Review every tag",
    description: "Every creator tag waits for you to approve it, with no automatic exceptions.",
  },
  {
    value: "OPEN",
    label: "Open to all creators",
    description:
      "Any approved creator can tag your products and they go live immediately. You're still notified and can remove any tag.",
  },
];

export const BRAND_TAG_POLICY_LABELS: Record<BrandTagReviewPolicyValue, string> = {
  TRUSTED_ONLY: "Trusted creators only",
  APPROVAL_REQUIRED: "Review every tag",
  OPEN: "Open to all creators",
};
