import { randomUUID } from "node:crypto";

import { addMinutes } from "date-fns/addMinutes";
import { subMinutes } from "date-fns/subMinutes";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import {
  FulfilmentStatus,
  PickupStatus,
  ShipmentStatus,
  TrackingEventCode,
  TrackingEventSource,
} from "#generated/prisma/enums.js";
import {
  createHubOrder,
  packGroupsIntoParcel,
  requireFixtureId,
} from "#test/integration/logistics-fixtures.js";

import { logisticsService } from "../logistics.service.js";
import { ORDER_TRACKING_STAGE, TRACKING_SUBJECT_KIND } from "./tracking.constants.js";
import type { RecordTrackingEventInput } from "./tracking.types.js";

const MINUTES_BETWEEN_EVENTS = 5;
const TWO_BRANDS = 2;
const ONE_DELIVERY_ATTEMPT = 1;
const ONE_EVENT = 1;

const pickupEvent = (
  fulfilmentGroupId: string,
  code: TrackingEventCode,
  overrides: Partial<RecordTrackingEventInput> = {},
): RecordTrackingEventInput => ({
  subject: { kind: TRACKING_SUBJECT_KIND.PICKUP, fulfilmentGroupId },
  code,
  source: TrackingEventSource.HUB,
  dedupeKey: randomUUID(),
  occurredAt: new Date(),
  ...overrides,
});

const parcelEvent = (
  shipmentId: string,
  code: TrackingEventCode,
  overrides: Partial<RecordTrackingEventInput> = {},
): RecordTrackingEventInput => ({
  subject: { kind: TRACKING_SUBJECT_KIND.SHIPMENT, shipmentId },
  code,
  source: TrackingEventSource.PARTNER_WEBHOOK,
  dedupeKey: randomUUID(),
  occurredAt: new Date(),
  ...overrides,
});

describe("logisticsService.recordEvent", () => {
  it("moves a pickup forward, stamps its time and rolls the order up", async () => {
    const { order, hubGroupIds } = await createHubOrder();
    const fulfilmentGroupId = requireFixtureId(hubGroupIds[0]);

    const outcome = await logisticsService.recordEvent(
      pickupEvent(fulfilmentGroupId, TrackingEventCode.READY_FOR_PICKUP, {
        source: TrackingEventSource.BRAND,
      }),
    );

    expect(outcome.appliedToStatus).toBe(true);
    expect(outcome.stageAfter?.stage).toBe(ORDER_TRACKING_STAGE.COLLECTING_ITEMS);
    const group = await prisma.orderFulfilmentGroup.findUniqueOrThrow({
      where: { id: fulfilmentGroupId },
    });
    expect(group.pickupStatus).toBe(PickupStatus.READY_FOR_PICKUP);
    expect(group.status).toBe(FulfilmentStatus.PACKED);
    expect(group.readyForPickupAt).not.toBeNull();
    const reloadedOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(reloadedOrder.fulfilmentStatus).toBe(FulfilmentStatus.PACKED);
  });

  it("stores a repeated event once and changes nothing the second time", async () => {
    const { hubGroupIds } = await createHubOrder();
    const fulfilmentGroupId = requireFixtureId(hubGroupIds[0]);
    const readyEvent = pickupEvent(fulfilmentGroupId, TrackingEventCode.READY_FOR_PICKUP);

    const firstOutcome = await logisticsService.recordEvent(readyEvent);
    const repeatedOutcome = await logisticsService.recordEvent(readyEvent);

    expect(repeatedOutcome.wasDuplicate).toBe(true);
    expect(repeatedOutcome.eventId).toBe(firstOutcome.eventId);
    expect(await prisma.trackingEvent.count({ where: { fulfilmentGroupId } })).toBe(ONE_EVENT);
  });

  it("stores but does not apply a move the state machine refuses", async () => {
    const { hubGroupIds } = await createHubOrder();
    const fulfilmentGroupId = requireFixtureId(hubGroupIds[0]);

    const outcome = await logisticsService.recordEvent(
      pickupEvent(fulfilmentGroupId, TrackingEventCode.AT_HUB),
    );

    expect(outcome.appliedToStatus).toBe(false);
    const storedEvent = await prisma.trackingEvent.findUniqueOrThrow({
      where: { id: outcome.eventId },
    });
    expect(storedEvent.appliedToStatus).toBe(false);
    const group = await prisma.orderFulfilmentGroup.findUniqueOrThrow({
      where: { id: fulfilmentGroupId },
    });
    expect(group.pickupStatus).toBe(PickupStatus.AWAITING_BRAND);
  });

  it("never lets an older event move a parcel backwards", async () => {
    const { order, hub, hubGroupIds } = await createHubOrder();
    const shipment = await packGroupsIntoParcel(order.id, hub.id, hubGroupIds);
    const now = new Date();

    await logisticsService.recordEvent(
      parcelEvent(shipment.id, TrackingEventCode.OUT_FOR_DELIVERY, { occurredAt: now }),
    );
    const lateOutcome = await logisticsService.recordEvent(
      parcelEvent(shipment.id, TrackingEventCode.DELIVERY_FAILED, {
        occurredAt: subMinutes(now, MINUTES_BETWEEN_EVENTS),
      }),
    );

    expect(lateOutcome.appliedToStatus).toBe(false);
    const reloadedShipment = await prisma.shipment.findUniqueOrThrow({
      where: { id: shipment.id },
    });
    expect(reloadedShipment.status).toBe(ShipmentStatus.OUT_FOR_DELIVERY);
    expect(reloadedShipment.deliveryAttemptCount).toBe(0);
  });

  it("delivers every brand in a combined parcel with one event and stamps delivery once", async () => {
    const { order, hub, hubGroupIds } = await createHubOrder({ hubBrandCount: TWO_BRANDS });
    const shipment = await packGroupsIntoParcel(order.id, hub.id, hubGroupIds);

    const outcome = await logisticsService.recordEvent(
      parcelEvent(shipment.id, TrackingEventCode.DELIVERED),
    );

    expect(outcome.stageAfter?.stage).toBe(ORDER_TRACKING_STAGE.DELIVERED);
    const groups = await prisma.orderFulfilmentGroup.findMany({ where: { orderId: order.id } });
    expect(groups.map((group) => group.status)).toEqual([
      FulfilmentStatus.DELIVERED,
      FulfilmentStatus.DELIVERED,
    ]);
    const deliveredOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(deliveredOrder.fulfilmentStatus).toBe(FulfilmentStatus.DELIVERED);
    expect(deliveredOrder.deliveredAt).not.toBeNull();

    await logisticsService.recordEvent(
      parcelEvent(shipment.id, TrackingEventCode.LOST, {
        isCorrection: true,
        source: TrackingEventSource.ADMIN,
      }),
    );
    await logisticsService.recordEvent(
      parcelEvent(shipment.id, TrackingEventCode.DELIVERED, {
        isCorrection: true,
        source: TrackingEventSource.ADMIN,
        occurredAt: addMinutes(new Date(), MINUTES_BETWEEN_EVENTS),
      }),
    );
    const redeliveredOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(redeliveredOrder.deliveredAt).toEqual(deliveredOrder.deliveredAt);
  });

  it("delivers the order only when both parcels of a split order are delivered", async () => {
    const { order, hub, hubGroupIds } = await createHubOrder({ hubBrandCount: TWO_BRANDS });
    const firstGroupId = requireFixtureId(hubGroupIds[0]);
    const secondGroupId = requireFixtureId(hubGroupIds[1]);
    const firstParcel = await packGroupsIntoParcel(order.id, hub.id, [firstGroupId]);
    const secondParcel = await packGroupsIntoParcel(order.id, hub.id, [secondGroupId]);

    await logisticsService.recordEvent(parcelEvent(firstParcel.id, TrackingEventCode.DELIVERED));
    const halfDeliveredOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(halfDeliveredOrder.fulfilmentStatus).toBe(FulfilmentStatus.PACKED);
    expect(halfDeliveredOrder.deliveredAt).toBeNull();

    await logisticsService.recordEvent(parcelEvent(secondParcel.id, TrackingEventCode.DELIVERED));
    const deliveredOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(deliveredOrder.fulfilmentStatus).toBe(FulfilmentStatus.DELIVERED);
    expect(deliveredOrder.deliveredAt).not.toBeNull();
  });

  it("keeps a mixed order at the brand-shipped group's progress", async () => {
    const { order, hub, hubGroupIds } = await createHubOrder({ brandShippedBrandCount: 1 });
    const shipment = await packGroupsIntoParcel(order.id, hub.id, hubGroupIds);

    await logisticsService.recordEvent(parcelEvent(shipment.id, TrackingEventCode.DELIVERED));

    const mixedOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(mixedOrder.fulfilmentStatus).toBe(FulfilmentStatus.PLACED);
  });

  it("counts failed delivery attempts and records when it last heard about the parcel", async () => {
    const { order, hub, hubGroupIds } = await createHubOrder();
    const shipment = await packGroupsIntoParcel(order.id, hub.id, hubGroupIds);

    await logisticsService.recordEvent(parcelEvent(shipment.id, TrackingEventCode.DELIVERY_FAILED));

    const reloadedShipment = await prisma.shipment.findUniqueOrThrow({
      where: { id: shipment.id },
    });
    expect(reloadedShipment.deliveryAttemptCount).toBe(ONE_DELIVERY_ATTEMPT);
    expect(reloadedShipment.lastEventAt.getTime()).toBeGreaterThan(shipment.lastEventAt.getTime());
  });

  it("applies only one of two identical moves racing each other", async () => {
    const { hubGroupIds } = await createHubOrder();
    const fulfilmentGroupId = requireFixtureId(hubGroupIds[0]);

    const outcomes = await Promise.all([
      logisticsService.recordEvent(
        pickupEvent(fulfilmentGroupId, TrackingEventCode.READY_FOR_PICKUP),
      ),
      logisticsService.recordEvent(
        pickupEvent(fulfilmentGroupId, TrackingEventCode.READY_FOR_PICKUP),
      ),
    ]);

    expect(outcomes.filter((outcome) => outcome.appliedToStatus)).toHaveLength(ONE_EVENT);
  });

  it("refuses an event for a pickup that does not exist", async () => {
    await expect(
      logisticsService.recordEvent(pickupEvent(randomUUID(), TrackingEventCode.READY_FOR_PICKUP)),
    ).rejects.toMatchObject({ code: "TRACKING_SUBJECT_NOT_FOUND" });
  });
});
