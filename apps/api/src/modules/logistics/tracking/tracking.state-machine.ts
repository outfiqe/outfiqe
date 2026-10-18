import { isBefore } from "date-fns/isBefore";

import { PickupStatus, ShipmentStatus } from "#generated/prisma/enums.js";

export const PICKUP_STATUS_NEXT: Readonly<Record<PickupStatus, readonly PickupStatus[]>> = {
  [PickupStatus.AWAITING_BRAND]: [PickupStatus.READY_FOR_PICKUP, PickupStatus.CANCELLED],
  [PickupStatus.READY_FOR_PICKUP]: [PickupStatus.PICKED_UP, PickupStatus.CANCELLED],
  [PickupStatus.PICKED_UP]: [PickupStatus.AT_HUB],
  [PickupStatus.AT_HUB]: [PickupStatus.IN_PARCEL, PickupStatus.RETURN_AT_HUB],
  [PickupStatus.IN_PARCEL]: [PickupStatus.AT_HUB, PickupStatus.RETURN_AT_HUB],
  [PickupStatus.RETURN_AT_HUB]: [PickupStatus.RETURNING_TO_BRAND],
  [PickupStatus.RETURNING_TO_BRAND]: [PickupStatus.RETURNED_TO_BRAND],
  [PickupStatus.RETURNED_TO_BRAND]: [],
  [PickupStatus.CANCELLED]: [],
};

const STATUSES_AFTER_PARTNER_HANDOVER: readonly ShipmentStatus[] = [
  ShipmentStatus.IN_TRANSIT,
  ShipmentStatus.OUT_FOR_DELIVERY,
  ShipmentStatus.DELIVERY_FAILED,
  ShipmentStatus.DELIVERED,
  ShipmentStatus.RETURNING,
  ShipmentStatus.RETURNED_TO_HUB,
  ShipmentStatus.LOST,
];

export const SHIPMENT_STATUS_NEXT: Readonly<Record<ShipmentStatus, readonly ShipmentStatus[]>> = {
  [ShipmentStatus.PACKED]: [
    ShipmentStatus.HANDED_TO_PARTNER,
    ShipmentStatus.IN_TRANSIT,
    ShipmentStatus.OUT_FOR_DELIVERY,
    ShipmentStatus.DELIVERY_FAILED,
    ShipmentStatus.DELIVERED,
    ShipmentStatus.CANCELLED,
  ],
  [ShipmentStatus.HANDED_TO_PARTNER]: STATUSES_AFTER_PARTNER_HANDOVER,
  [ShipmentStatus.IN_TRANSIT]: STATUSES_AFTER_PARTNER_HANDOVER.filter(
    (status) => status !== ShipmentStatus.IN_TRANSIT,
  ),
  [ShipmentStatus.OUT_FOR_DELIVERY]: [
    ShipmentStatus.DELIVERY_FAILED,
    ShipmentStatus.DELIVERED,
    ShipmentStatus.RETURNING,
    ShipmentStatus.RETURNED_TO_HUB,
    ShipmentStatus.LOST,
  ],
  [ShipmentStatus.DELIVERY_FAILED]: [
    ShipmentStatus.IN_TRANSIT,
    ShipmentStatus.OUT_FOR_DELIVERY,
    ShipmentStatus.DELIVERED,
    ShipmentStatus.RETURNING,
    ShipmentStatus.RETURNED_TO_HUB,
    ShipmentStatus.LOST,
  ],
  [ShipmentStatus.RETURNING]: [ShipmentStatus.RETURNED_TO_HUB, ShipmentStatus.LOST],
  [ShipmentStatus.DELIVERED]: [],
  [ShipmentStatus.RETURNED_TO_HUB]: [],
  [ShipmentStatus.CANCELLED]: [],
  [ShipmentStatus.LOST]: [],
};

type StatusMoveCheck<Status extends string> = {
  currentStatus: Status;
  nextStatus: Status;
  currentStatusChangedAt: Date | null;
  occurredAt: Date;
  isCorrection: boolean;
  allowedNextStatuses: Readonly<Record<Status, readonly Status[]>>;
};

export const canApplyStatusMove = <Status extends string>({
  currentStatus,
  nextStatus,
  currentStatusChangedAt,
  occurredAt,
  isCorrection,
  allowedNextStatuses,
}: StatusMoveCheck<Status>): boolean => {
  if (currentStatus === nextStatus) return false;
  if (isCorrection) return true;

  const happenedBeforeCurrentStatus =
    currentStatusChangedAt !== null && isBefore(occurredAt, currentStatusChangedAt);
  if (happenedBeforeCurrentStatus) return false;

  return allowedNextStatuses[currentStatus].includes(nextStatus);
};
