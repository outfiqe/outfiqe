import { ParcelReturnOutcome, ShipmentStatus } from "#generated/prisma/enums.js";

import { SHIPMENT_STATUSES_WITH_PARTNER } from "../logistics.constants.js";

export const RETURN_DEDUPE_PREFIX = {
  PARCEL_RETURNED: "parcel-returned",
  PICKUP_RETURNED: "pickup-returned",
} as const;

export const RETURN_REFUND_KEY_PREFIX = "parcel-return-refund";

export const RETURN_REFUND_REASONS: Readonly<Record<ParcelReturnOutcome, string>> = {
  [ParcelReturnOutcome.CUSTOMER_REFUSED_OR_UNREACHABLE]: "Refused or not received at delivery",
  [ParcelReturnOutcome.WRONG_OR_DAMAGED_ITEM]: "Wrong or damaged item found on return",
  [ParcelReturnOutcome.PARTNER_DAMAGED_OR_LOST]: "Damaged by the delivery partner",
};

export const LOST_PARCEL_REFUND_REASON = "The delivery partner lost the parcel";

export const PARCEL_STATUSES_ACCEPTING_RETURN: ReadonlySet<ShipmentStatus> = new Set([
  ...SHIPMENT_STATUSES_WITH_PARTNER,
  ShipmentStatus.RETURNED_TO_HUB,
]);
