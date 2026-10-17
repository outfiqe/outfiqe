import type { BrandReturnSource, BrandReturnStatus } from "../api/brandReturnSchemas";

export const BRAND_RETURNS_QUERY_KEY = ["brand-returns"] as const;

export const BRAND_RETURN_STATUS_LABELS: Record<BrandReturnStatus, string> = {
  AT_HUB: "At the Outfiqe hub",
  ON_ROUND: "On its way to you",
  DROPPED_OFF: "Handed to you — please confirm",
  CONFIRMED: "Received",
};

export const BRAND_RETURN_SOURCE_LABELS: Record<BrandReturnSource, string> = {
  PARCEL_RETURNED: "The customer didn't take the parcel",
  FAILED_INSPECTION: "Failed our quality check",
};
