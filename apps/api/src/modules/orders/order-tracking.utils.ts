import type { FulfilmentMode, PickupStatus, ShipmentStatus } from "#generated/prisma/enums.js";
import { utcMidnightToCalendarDate } from "#lib/working-days.utils.js";
import { describeOrderTrackingStage } from "#modules/logistics/tracking/tracking.stage.js";
import type { OrderTrackingStageSummary } from "#modules/logistics/tracking/tracking.types.js";

import type { OrderDeliveryPromise } from "./order.types.js";

type GroupForTracking = {
  fulfilmentMode: FulfilmentMode;
  pickupStatus: PickupStatus | null;
  shipmentId: string | null;
  shipment?: { status: ShipmentStatus } | null;
};

type OrderPromiseDates = {
  promisedDeliveryFrom?: Date | null;
  promisedDeliveryBy?: Date | null;
};

export const toOrderTrackingStage = (
  groups: readonly GroupForTracking[] | undefined,
): OrderTrackingStageSummary | null =>
  groups
    ? describeOrderTrackingStage(
        groups.map(({ fulfilmentMode, pickupStatus, shipmentId, shipment }) => ({
          fulfilmentMode,
          pickupStatus,
          shipmentStatus: shipment?.status ?? null,
          hasBeenInParcel: shipmentId !== null,
        })),
      )
    : null;

export const toOrderDeliveryPromise = ({
  promisedDeliveryFrom,
  promisedDeliveryBy,
}: OrderPromiseDates): OrderDeliveryPromise | null =>
  promisedDeliveryFrom && promisedDeliveryBy
    ? {
        from: utcMidnightToCalendarDate(promisedDeliveryFrom),
        by: utcMidnightToCalendarDate(promisedDeliveryBy),
      }
    : null;
