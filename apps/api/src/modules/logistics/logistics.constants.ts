import { PickupStatus } from "#generated/prisma/enums.js";

export const PICKUP_STATUSES_NOT_COMING_TO_HUB: ReadonlySet<PickupStatus> = new Set([
  PickupStatus.AT_HUB,
  PickupStatus.IN_PARCEL,
  PickupStatus.CANCELLED,
  PickupStatus.RETURN_AT_HUB,
  PickupStatus.RETURNING_TO_BRAND,
  PickupStatus.RETURNED_TO_BRAND,
]);
