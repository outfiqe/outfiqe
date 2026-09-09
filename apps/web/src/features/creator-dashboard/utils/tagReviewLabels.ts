import type { TagRejectionReasonValue, TagReviewStatusValue } from "../api/creatorLooksSchemas";

export const TAG_REVIEW_STATUS_LABELS: Record<TagReviewStatusValue, string> = {
  PENDING: "In review",
  APPROVED: "Live",
  REJECTED: "Declined",
};

export const TAG_REJECTION_REASON_LABELS: Record<TagRejectionReasonValue, string> = {
  NOT_OUR_PRODUCT: "The brand says this isn't one of their products",
  COUNTERFEIT_SUSPECTED: "The brand flagged this as a possible counterfeit",
  MISREPRESENTS_PRODUCT: "The brand says the look misrepresents the product",
  POLICY_VIOLATION: "The tag breaks the brand's tagging policy",
  OTHER: "The brand declined this tag",
};

export const TAG_IN_REVIEW_HINT =
  "This tag stays hidden on your post until the brand approves it. Your post is already live.";
