import type { PickupStatusValue } from "../api/hubOperationsSchemas";

export const PICKUP_STATUS_LABELS: Record<PickupStatusValue, string> = {
  AWAITING_BRAND: "Brand is packing",
  READY_FOR_PICKUP: "Ready for a rider",
  PICKED_UP: "On the way to the hub",
  AT_HUB: "At the hub",
  IN_PARCEL: "Packed",
  RETURN_AT_HUB: "Back at the hub",
  RETURNING_TO_BRAND: "Going back to the brand",
  RETURNED_TO_BRAND: "Back with the brand",
  CANCELLED: "Cancelled",
};

export const DEFAULT_PARCEL_WEIGHT_GRAMS = 1000;
export const DEFAULT_PACKAGES_PER_PARCEL = 1;
export const MAX_PARCEL_WEIGHT_GRAMS = 50_000;
export const MAX_PACKAGES_PER_PARCEL = 10;
export const MAX_SCAN_RESULTS_SHOWN = 20;
