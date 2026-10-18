import {
  FulfilmentStatus,
  PickupStatus,
  ShipmentStatus,
  TrackingEventCode,
} from "#generated/prisma/enums.js";

const PICKUP_STATUS_BY_EVENT_CODE: Partial<Record<TrackingEventCode, PickupStatus>> = {
  [TrackingEventCode.AWAITING_BRAND]: PickupStatus.AWAITING_BRAND,
  [TrackingEventCode.READY_FOR_PICKUP]: PickupStatus.READY_FOR_PICKUP,
  [TrackingEventCode.PICKED_UP]: PickupStatus.PICKED_UP,
  [TrackingEventCode.AT_HUB]: PickupStatus.AT_HUB,
  [TrackingEventCode.IN_PARCEL]: PickupStatus.IN_PARCEL,
  [TrackingEventCode.RETURN_AT_HUB]: PickupStatus.RETURN_AT_HUB,
  [TrackingEventCode.RETURNING_TO_BRAND]: PickupStatus.RETURNING_TO_BRAND,
  [TrackingEventCode.RETURNED_TO_BRAND]: PickupStatus.RETURNED_TO_BRAND,
  [TrackingEventCode.CANCELLED]: PickupStatus.CANCELLED,
};

const SHIPMENT_STATUS_BY_EVENT_CODE: Partial<Record<TrackingEventCode, ShipmentStatus>> = {
  [TrackingEventCode.PACKED]: ShipmentStatus.PACKED,
  [TrackingEventCode.HANDED_TO_PARTNER]: ShipmentStatus.HANDED_TO_PARTNER,
  [TrackingEventCode.IN_TRANSIT]: ShipmentStatus.IN_TRANSIT,
  [TrackingEventCode.OUT_FOR_DELIVERY]: ShipmentStatus.OUT_FOR_DELIVERY,
  [TrackingEventCode.DELIVERY_FAILED]: ShipmentStatus.DELIVERY_FAILED,
  [TrackingEventCode.DELIVERED]: ShipmentStatus.DELIVERED,
  [TrackingEventCode.RETURNING]: ShipmentStatus.RETURNING,
  [TrackingEventCode.RETURNED_TO_HUB]: ShipmentStatus.RETURNED_TO_HUB,
  [TrackingEventCode.LOST]: ShipmentStatus.LOST,
  [TrackingEventCode.CANCELLED]: ShipmentStatus.CANCELLED,
};

const COARSE_STATUS_BY_SHIPMENT_STATUS: Record<ShipmentStatus, FulfilmentStatus> = {
  [ShipmentStatus.PACKED]: FulfilmentStatus.PACKED,
  [ShipmentStatus.HANDED_TO_PARTNER]: FulfilmentStatus.SHIPPED,
  [ShipmentStatus.IN_TRANSIT]: FulfilmentStatus.SHIPPED,
  [ShipmentStatus.OUT_FOR_DELIVERY]: FulfilmentStatus.SHIPPED,
  [ShipmentStatus.DELIVERY_FAILED]: FulfilmentStatus.SHIPPED,
  [ShipmentStatus.DELIVERED]: FulfilmentStatus.DELIVERED,
  [ShipmentStatus.RETURNING]: FulfilmentStatus.RETURNED,
  [ShipmentStatus.RETURNED_TO_HUB]: FulfilmentStatus.RETURNED,
  [ShipmentStatus.CANCELLED]: FulfilmentStatus.PACKED,
  [ShipmentStatus.LOST]: FulfilmentStatus.CANCELLED,
};

const RETURN_PICKUP_STATUSES: ReadonlySet<PickupStatus> = new Set([
  PickupStatus.RETURN_AT_HUB,
  PickupStatus.RETURNING_TO_BRAND,
  PickupStatus.RETURNED_TO_BRAND,
]);

const COARSE_STATUS_BY_FORWARD_PICKUP_STATUS: Partial<Record<PickupStatus, FulfilmentStatus>> = {
  [PickupStatus.AWAITING_BRAND]: FulfilmentStatus.PLACED,
  [PickupStatus.READY_FOR_PICKUP]: FulfilmentStatus.PACKED,
  [PickupStatus.PICKED_UP]: FulfilmentStatus.PACKED,
  [PickupStatus.AT_HUB]: FulfilmentStatus.PACKED,
  [PickupStatus.CANCELLED]: FulfilmentStatus.CANCELLED,
};

const COARSE_STATUS_TIMESTAMP_FIELD = {
  [FulfilmentStatus.PACKED]: "packedAt",
  [FulfilmentStatus.SHIPPED]: "shippedAt",
  [FulfilmentStatus.DELIVERED]: "deliveredAt",
  [FulfilmentStatus.CANCELLED]: "cancelledAt",
  [FulfilmentStatus.RETURNED]: "returnedAt",
} as const satisfies Partial<Record<FulfilmentStatus, string>>;

type CoarseStatusTimestampField =
  (typeof COARSE_STATUS_TIMESTAMP_FIELD)[keyof typeof COARSE_STATUS_TIMESTAMP_FIELD];

const PICKUP_STATUS_TIMESTAMP_FIELD = {
  [PickupStatus.READY_FOR_PICKUP]: "readyForPickupAt",
  [PickupStatus.PICKED_UP]: "pickedUpAt",
  [PickupStatus.AT_HUB]: "atHubAt",
} as const satisfies Partial<Record<PickupStatus, string>>;

type PickupStatusTimestampField =
  (typeof PICKUP_STATUS_TIMESTAMP_FIELD)[keyof typeof PICKUP_STATUS_TIMESTAMP_FIELD];

type GroupCoarseStatusInput = {
  pickupStatus: PickupStatus;
  shipmentStatus: ShipmentStatus | null;
  hasBeenInParcel: boolean;
};

const hasCoarseTimestampField = (
  status: FulfilmentStatus,
): status is keyof typeof COARSE_STATUS_TIMESTAMP_FIELD =>
  Object.hasOwn(COARSE_STATUS_TIMESTAMP_FIELD, status);

const hasPickupTimestampField = (
  status: PickupStatus,
): status is keyof typeof PICKUP_STATUS_TIMESTAMP_FIELD =>
  Object.hasOwn(PICKUP_STATUS_TIMESTAMP_FIELD, status);

export const pickupStatusForEventCode = (code: TrackingEventCode): PickupStatus | null =>
  PICKUP_STATUS_BY_EVENT_CODE[code] ?? null;

export const shipmentStatusForEventCode = (code: TrackingEventCode): ShipmentStatus | null =>
  SHIPMENT_STATUS_BY_EVENT_CODE[code] ?? null;

export const isReturnPickupStatus = (status: PickupStatus): boolean =>
  RETURN_PICKUP_STATUSES.has(status);

export const resolveCoarseGroupStatus = ({
  pickupStatus,
  shipmentStatus,
  hasBeenInParcel,
}: GroupCoarseStatusInput): FulfilmentStatus => {
  if (isReturnPickupStatus(pickupStatus)) {
    return hasBeenInParcel ? FulfilmentStatus.RETURNED : FulfilmentStatus.CANCELLED;
  }
  if (pickupStatus === PickupStatus.IN_PARCEL) {
    return shipmentStatus === null
      ? FulfilmentStatus.PACKED
      : COARSE_STATUS_BY_SHIPMENT_STATUS[shipmentStatus];
  }
  return COARSE_STATUS_BY_FORWARD_PICKUP_STATUS[pickupStatus] ?? FulfilmentStatus.PLACED;
};

export const buildCoarseStatusUpdate = (
  status: FulfilmentStatus,
  changedAt: Date,
): { status: FulfilmentStatus } & Partial<Record<CoarseStatusTimestampField, Date>> =>
  hasCoarseTimestampField(status)
    ? { status, [COARSE_STATUS_TIMESTAMP_FIELD[status]]: changedAt }
    : { status };

export const buildPickupTimestampUpdate = (
  status: PickupStatus,
  changedAt: Date,
): Partial<Record<PickupStatusTimestampField, Date>> =>
  hasPickupTimestampField(status) ? { [PICKUP_STATUS_TIMESTAMP_FIELD[status]]: changedAt } : {};
