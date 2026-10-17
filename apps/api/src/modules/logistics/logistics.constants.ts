import { PickupStatus, ShipmentStatus } from "#generated/prisma/enums.js";

export const SHIPMENT_STATUSES_WITH_PARTNER = [
  ShipmentStatus.HANDED_TO_PARTNER,
  ShipmentStatus.IN_TRANSIT,
  ShipmentStatus.OUT_FOR_DELIVERY,
  ShipmentStatus.DELIVERY_FAILED,
  ShipmentStatus.RETURNING,
];

export const PICKUP_STATUSES_NOT_COMING_TO_HUB: ReadonlySet<PickupStatus> = new Set([
  PickupStatus.AT_HUB,
  PickupStatus.IN_PARCEL,
  PickupStatus.CANCELLED,
  PickupStatus.RETURN_AT_HUB,
  PickupStatus.RETURNING_TO_BRAND,
  PickupStatus.RETURNED_TO_BRAND,
]);
