import type { Prisma } from "#generated/prisma/client.js";
import {
  type FulfilmentStatus,
  PickupStatus,
  ShipmentStatus,
  type TrackingEventSource,
} from "#generated/prisma/enums.js";
import type { DbClient } from "#types/db.types.js";

import { buildCoarseStatusUpdate, buildPickupTimestampUpdate } from "./tracking.mapping.js";
import type { TrackedGroupSnapshot } from "./tracking.types.js";

const DELIVERY_ATTEMPT_STEP = 1;
const NO_ROWS_UPDATED = 0;

const pickupSubjectSelect = {
  id: true,
  orderId: true,
  pickupStatus: true,
  pickupStatusChangedAt: true,
  shipmentId: true,
  shipment: { select: { status: true } },
} satisfies Prisma.OrderFulfilmentGroupSelect;

const shipmentSubjectSelect = {
  id: true,
  orderId: true,
  status: true,
  statusChangedAt: true,
  codAmountToCollect: true,
} satisfies Prisma.ShipmentSelect;

type PickupStatusMove = {
  fulfilmentGroupId: string;
  fromStatus: PickupStatus;
  toStatus: PickupStatus;
  coarseStatus: FulfilmentStatus;
  changedAt: Date;
};

type ShipmentStatusMove = {
  shipmentId: string;
  fromStatus: ShipmentStatus;
  toStatus: ShipmentStatus;
  changedAt: Date;
  codCollectedAmount: number;
};

const buildShipmentStatusSideEffects = ({
  toStatus,
  changedAt,
  codCollectedAmount,
}: ShipmentStatusMove): Prisma.ShipmentUpdateManyMutationInput => {
  if (toStatus === ShipmentStatus.DELIVERED) return { deliveredAt: changedAt, codCollectedAmount };
  if (toStatus === ShipmentStatus.DELIVERY_FAILED) {
    return { deliveryAttemptCount: { increment: DELIVERY_ATTEMPT_STEP } };
  }
  return {};
};

export const logisticsTrackingRepository = {
  async insertTrackingEvent(
    client: DbClient,
    trackingEvent: Prisma.TrackingEventUncheckedCreateInput,
  ): Promise<{ id: string } | null> {
    const [insertedEvent] = await client.trackingEvent.createManyAndReturn({
      data: [trackingEvent],
      skipDuplicates: true,
      select: { id: true },
    });
    return insertedEvent ?? null;
  },

  async findTrackingEventByDedupeKey(
    client: DbClient,
    source: TrackingEventSource,
    dedupeKey: string,
  ) {
    return client.trackingEvent.findUnique({
      where: { source_dedupeKey: { source, dedupeKey } },
      select: { id: true, appliedToStatus: true },
    });
  },

  async markTrackingEventApplied(client: DbClient, trackingEventId: string): Promise<void> {
    await client.trackingEvent.update({
      where: { id: trackingEventId },
      data: { appliedToStatus: true },
    });
  },

  async findPickupSubject(client: DbClient, fulfilmentGroupId: string) {
    return client.orderFulfilmentGroup.findUnique({
      where: { id: fulfilmentGroupId },
      select: pickupSubjectSelect,
    });
  },

  async findShipmentSubject(client: DbClient, shipmentId: string) {
    return client.shipment.findUnique({
      where: { id: shipmentId },
      select: shipmentSubjectSelect,
    });
  },

  async movePickupStatus(
    client: DbClient,
    { fulfilmentGroupId, fromStatus, toStatus, coarseStatus, changedAt }: PickupStatusMove,
  ): Promise<boolean> {
    const { count } = await client.orderFulfilmentGroup.updateMany({
      where: { id: fulfilmentGroupId, pickupStatus: fromStatus },
      data: {
        pickupStatus: toStatus,
        pickupStatusChangedAt: changedAt,
        ...buildPickupTimestampUpdate(toStatus, changedAt),
        ...buildCoarseStatusUpdate(coarseStatus, changedAt),
      },
    });
    return count > NO_ROWS_UPDATED;
  },

  async moveShipmentStatus(client: DbClient, shipmentMove: ShipmentStatusMove): Promise<boolean> {
    const { shipmentId, fromStatus, toStatus, changedAt } = shipmentMove;
    const { count } = await client.shipment.updateMany({
      where: { id: shipmentId, status: fromStatus },
      data: {
        status: toStatus,
        statusChangedAt: changedAt,
        ...buildShipmentStatusSideEffects(shipmentMove),
      },
    });
    return count > NO_ROWS_UPDATED;
  },

  async setShipmentLastEventAt(
    client: DbClient,
    shipmentId: string,
    lastEventAt: Date,
  ): Promise<void> {
    await client.shipment.update({ where: { id: shipmentId }, data: { lastEventAt } });
  },

  async setCoarseStatusForParcelGroups(
    client: DbClient,
    shipmentId: string,
    coarseStatus: FulfilmentStatus,
    changedAt: Date,
  ): Promise<void> {
    await client.orderFulfilmentGroup.updateMany({
      where: { shipmentId, pickupStatus: PickupStatus.IN_PARCEL },
      data: buildCoarseStatusUpdate(coarseStatus, changedAt),
    });
  },

  async listOrderGroupSnapshots(
    client: DbClient,
    orderId: string,
  ): Promise<TrackedGroupSnapshot[]> {
    const groups = await client.orderFulfilmentGroup.findMany({
      where: { orderId },
      select: {
        fulfilmentMode: true,
        pickupStatus: true,
        shipmentId: true,
        shipment: { select: { status: true } },
      },
    });
    return groups.map(({ fulfilmentMode, pickupStatus, shipmentId, shipment }) => ({
      fulfilmentMode,
      pickupStatus,
      shipmentStatus: shipment?.status ?? null,
      hasBeenInParcel: shipmentId !== null,
    }));
  },

  async findOrderOwnerAndStatus(client: DbClient, orderId: string) {
    return client.order.findUniqueOrThrow({
      where: { id: orderId },
      select: { userId: true, fulfilmentStatus: true },
    });
  },
};
