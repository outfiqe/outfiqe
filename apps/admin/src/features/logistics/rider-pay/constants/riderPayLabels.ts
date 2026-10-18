import type { RiderEarningStatus } from "../api/riderPaySchemas";

export const PAY_COUNTRY_CODE = "NP";

export const RIDER_EARNING_STATUS_LABELS: Record<RiderEarningStatus, string> = {
  PENDING: "On hold",
  AVAILABLE: "Ready to withdraw",
  WITHDRAWN: "Paid out",
  VOIDED: "Voided",
};

export const VOIDABLE_EARNING_STATUSES: ReadonlySet<RiderEarningStatus> = new Set([
  "PENDING",
  "AVAILABLE",
]);
