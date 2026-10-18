import type { RiderEarningKind, RiderEarningStatus } from "../api/riderEarningsSchemas";

export const RIDER_EARNING_STATUS_LABELS: Record<RiderEarningStatus, string> = {
  PENDING: "On hold",
  AVAILABLE: "Ready to withdraw",
  WITHDRAWN: "Paid to you",
  VOIDED: "Cancelled",
};

export const RIDER_EARNING_KIND_LABELS: Record<RiderEarningKind, string> = {
  VISIT: "Visit",
  WASTED_VISIT: "Wasted visit",
};
