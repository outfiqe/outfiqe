import type { MetricTag } from "../api/tagReviewsSchemas";
import { REASON_LABEL, SOURCE_LABEL } from "../constants/tagReviewMetrics.constants";

type BadgeTone = "neutral" | "success" | "negative";

const STATUS_DISPLAY: Record<MetricTag["reviewStatus"], { label: string; tone: BadgeTone }> = {
  PENDING: { label: "Waiting", tone: "neutral" },
  APPROVED: { label: "Live", tone: "success" },
  REJECTED: { label: "Rejected", tone: "negative" },
};

export const toStatusDisplay = ({ reviewStatus }: MetricTag) => STATUS_DISPLAY[reviewStatus];

export const describeTagOutcome = ({
  reviewStatus,
  approvalSource,
  rejectionReason,
}: MetricTag): string => {
  if (reviewStatus === "PENDING") return "Waiting for the brand";
  if (reviewStatus === "REJECTED") {
    return rejectionReason ? REASON_LABEL[rejectionReason] : "Rejected by the brand";
  }
  return approvalSource ? SOURCE_LABEL[approvalSource] : "Approved";
};
