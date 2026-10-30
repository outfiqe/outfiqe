import { millisecondsInHour } from "date-fns/constants";
export const COMMISSION_SWEEP_INTERVAL_MS = millisecondsInHour;

export const COMMISSION_RECIPIENT_KIND = {
  PERSON: "PERSON",
  BRAND: "BRAND",
} as const;

export const COMMISSION_TIER_AUDIT_TARGET_TYPE = "CommissionTier";
