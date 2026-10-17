import { isAfter } from "date-fns/isAfter";
import { isBefore } from "date-fns/isBefore";
import { max } from "date-fns/max";
import { subHours } from "date-fns/subHours";

import type {
  PickupBoardLocationRecord,
  RiderTaskDetailRecord,
  RiderTaskSummaryRecord,
} from "./rounds.repository.js";
import type { PickupBoardLocation, RiderTaskSummary, RiderTaskView } from "./rounds.types.js";

export const RIDER_SCAN_MAX_AGE_HOURS = 24;

export const SCAN_TIME_VERDICT = {
  ACCEPTED: "ACCEPTED",
  TOO_OLD: "TOO_OLD",
} as const;

type ScanTimeResolution =
  | { verdict: typeof SCAN_TIME_VERDICT.ACCEPTED; occurredAt: Date }
  | { verdict: typeof SCAN_TIME_VERDICT.TOO_OLD };

export const resolveScanOccurredAt = ({
  deviceScannedAt,
  pickupStatusChangedAt,
  now,
}: {
  deviceScannedAt: Date;
  pickupStatusChangedAt: Date | null;
  now: Date;
}): ScanTimeResolution => {
  if (isBefore(deviceScannedAt, subHours(now, RIDER_SCAN_MAX_AGE_HOURS))) {
    return { verdict: SCAN_TIME_VERDICT.TOO_OLD };
  }
  const notInFuture = isAfter(deviceScannedAt, now) ? now : deviceScannedAt;
  const occurredAt = pickupStatusChangedAt
    ? max([notInFuture, pickupStatusChangedAt])
    : notInFuture;
  return { verdict: SCAN_TIME_VERDICT.ACCEPTED, occurredAt };
};

export const toPickupBoardLocation = (
  location: PickupBoardLocationRecord,
): PickupBoardLocation => ({
  pickupLocationId: location.id,
  label: location.label,
  brandId: location.brandId,
  brandName: location.brand.name,
  address: location.address,
  city: location.city,
  pickups: location.fulfilmentGroups.map((group) => ({
    fulfilmentGroupId: group.id,
    orderId: group.orderId,
    itemCount: group._count.items,
    readyForPickupAt: group.readyForPickupAt?.toISOString() ?? null,
  })),
});

export const toRiderTaskSummary = (task: RiderTaskSummaryRecord): RiderTaskSummary => ({
  id: task.id,
  status: task.status,
  roundStartsAt: task.roundStartsAt.toISOString(),
  riderId: task.riderId,
  riderName: task.rider.user.name,
  brandName: task.brand.name,
  pickupLocationLabel: task.pickupLocation.label,
  stopCount: task.stops.length,
  collectedCount: task.stops.filter((stop) => stop.scannedAt !== null).length,
  assignedAt: task.assignedAt.toISOString(),
  completedAt: task.completedAt?.toISOString() ?? null,
  wastedReason: task.wastedReason,
});

export const toRiderTaskView = (task: RiderTaskDetailRecord): RiderTaskView => {
  const { pickupLocation } = task;
  return {
    id: task.id,
    status: task.status,
    roundStartsAt: task.roundStartsAt.toISOString(),
    brandName: task.brand.name,
    pickupLocation: {
      ...pickupLocation,
      latitude: pickupLocation.latitude?.toNumber() ?? null,
      longitude: pickupLocation.longitude?.toNumber() ?? null,
    },
    stops: task.stops.map((stop) => ({
      id: stop.id,
      fulfilmentGroupId: stop.fulfilmentGroup.id,
      orderId: stop.fulfilmentGroup.orderId,
      itemCount: stop.fulfilmentGroup._count.items,
      isCollected: stop.scannedAt !== null,
      bagTagCode: stop.fulfilmentGroup.bagTag?.code ?? null,
    })),
  };
};
