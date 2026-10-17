import { subDays } from "date-fns/subDays";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import {
  FulfilmentMode,
  ShipmentStatus,
  TrackingEventCode,
  TrackingEventSource,
} from "#generated/prisma/enums.js";
import { authHeaderFor } from "#test/integration/coupon-fixtures.js";
import { createHubOrder } from "#test/integration/logistics-fixtures.js";
import { createBuyer } from "#test/integration/order-fixtures.js";
import { createParcelWithApiPartner } from "#test/integration/partner-connection-fixtures.js";
import { testApp } from "#test/integration/test-app.js";

import { ORDER_TRACKING_STAGE } from "../tracking/tracking.constants.js";

const LOGISTICS_ORDERS_PATH = "/api/logistics/orders";
const DAYS_PAST_DISPUTE_WINDOW = 4;
const DISPUTE_DETAILS = "The courier marked it delivered but nothing came to my door.";

const getTracking = (userId: string, orderId: string) =>
  request(testApp)
    .get(`${LOGISTICS_ORDERS_PATH}/${orderId}/tracking`)
    .set("Authorization", authHeaderFor(userId));

const reportNotReceived = (userId: string, orderId: string, shipmentId: string) =>
  request(testApp)
    .post(`${LOGISTICS_ORDERS_PATH}/${orderId}/delivery-disputes`)
    .set("Authorization", authHeaderFor(userId))
    .send({ shipmentId, details: DISPUTE_DETAILS });

const recordShipmentEvent = (
  shipmentId: string,
  code: TrackingEventCode,
  appliedToStatus: boolean,
) =>
  prisma.trackingEvent.create({
    data: {
      shipmentId,
      code,
      source: TrackingEventSource.PARTNER_WEBHOOK,
      dedupeKey: `${shipmentId}:${code}`,
      occurredAt: new Date(),
      appliedToStatus,
      location: "Kathmandu sorting centre",
    },
  });

const createDeliveredParcel = async (deliveredAt: Date) => {
  const parcel = await createParcelWithApiPartner({ shipmentStatus: ShipmentStatus.DELIVERED });
  await prisma.shipment.update({ where: { id: parcel.shipment.id }, data: { deliveredAt } });
  return parcel;
};

describe("customer order tracking", () => {
  it("shows the buyer where their order is, with the partner's link and only their events", async () => {
    const { order, partner, shipment, partnerReference } = await createParcelWithApiPartner({
      shipmentStatus: ShipmentStatus.IN_TRANSIT,
    });
    await prisma.deliveryPartner.update({
      where: { id: partner.id },
      data: { trackingUrlTemplate: "https://partner.example/track/{reference}" },
    });
    await recordShipmentEvent(shipment.id, TrackingEventCode.IN_TRANSIT, true);
    await recordShipmentEvent(shipment.id, TrackingEventCode.BAG_TAGGED, true);
    await recordShipmentEvent(shipment.id, TrackingEventCode.OUT_FOR_DELIVERY, false);

    const response = await getTracking(order.userId, order.id);

    expect(response.status).toBe(HTTP_STATUS.OK);
    const { stage, parcels, events } = response.body.data;
    expect(stage).toMatchObject({ stage: ORDER_TRACKING_STAGE.ON_ITS_WAY });
    expect(parcels).toEqual([
      expect.objectContaining({
        shipmentId: shipment.id,
        status: ShipmentStatus.IN_TRANSIT,
        partnerName: partner.name,
        partnerTrackingUrl: `https://partner.example/track/${partnerReference}`,
        canReportNotReceived: false,
      }),
    ]);
    expect(events).toEqual([
      expect.objectContaining({
        code: TrackingEventCode.IN_TRANSIT,
        location: "Kathmandu sorting centre",
      }),
    ]);
  });

  it("keeps another shopper's order private", async () => {
    const { order } = await createParcelWithApiPartner();
    const otherShopper = await createBuyer();

    expect((await getTracking(otherShopper.id, order.id)).status).toBe(HTTP_STATUS.NOT_FOUND);
  });

  it("adds the delivery stage to the order itself, and leaves it out for brand-shipped orders", async () => {
    const { order } = await createParcelWithApiPartner({
      shipmentStatus: ShipmentStatus.IN_TRANSIT,
    });
    const { order: brandShippedOrder } = await createHubOrder({
      hubBrandCount: 0,
      brandShippedBrandCount: 1,
    });

    const hubOrder = await request(testApp)
      .get(`/api/orders/${order.id}`)
      .set("Authorization", authHeaderFor(order.userId));
    const brandOrder = await request(testApp)
      .get(`/api/orders/${brandShippedOrder.id}`)
      .set("Authorization", authHeaderFor(brandShippedOrder.userId));

    expect(hubOrder.status).toBe(HTTP_STATUS.OK);
    expect(hubOrder.body.data.trackingStage).toMatchObject({
      stage: ORDER_TRACKING_STAGE.ON_ITS_WAY,
    });
    expect(hubOrder.body.data.shipments[0].fulfilmentMode).toBe(FulfilmentMode.OUTFIQE_LOGISTICS);
    expect(brandOrder.body.data.trackingStage).toBeNull();
  });
});

describe("reporting a parcel that didn't arrive", () => {
  it("records the report once and tells the buyer it's being looked at", async () => {
    const { order, shipment } = await createDeliveredParcel(new Date());

    const firstReport = await reportNotReceived(order.userId, order.id, shipment.id);
    const repeatReport = await reportNotReceived(order.userId, order.id, shipment.id);

    expect(firstReport.status).toBe(HTTP_STATUS.CREATED);
    expect(firstReport.body.data).toMatchObject({
      canReportNotReceived: false,
      isReportedNotReceived: true,
    });
    expect(repeatReport.status).toBe(HTTP_STATUS.CONFLICT);
    const disputes = await prisma.trackingEvent.findMany({
      where: { shipmentId: shipment.id, code: TrackingEventCode.DELIVERY_DISPUTED },
    });
    expect(disputes).toEqual([
      expect.objectContaining({ note: DISPUTE_DETAILS, actorUserId: order.userId }),
    ]);
  });

  it("only takes reports for a parcel delivered in the last three days", async () => {
    const { order, shipment } = await createDeliveredParcel(
      subDays(new Date(), DAYS_PAST_DISPUTE_WINDOW),
    );
    const { order: openOrder, shipment: openParcel } = await createParcelWithApiPartner({
      shipmentStatus: ShipmentStatus.OUT_FOR_DELIVERY,
    });

    const lateReport = await reportNotReceived(order.userId, order.id, shipment.id);
    const earlyReport = await reportNotReceived(openOrder.userId, openOrder.id, openParcel.id);

    expect(lateReport.status).toBe(HTTP_STATUS.CONFLICT);
    expect(lateReport.body.code).toBe("DELIVERY_DISPUTE_CLOSED");
    expect(earlyReport.status).toBe(HTTP_STATUS.CONFLICT);
  });

  it("checks the details and the parcel belong to the buyer's order", async () => {
    const { order, shipment } = await createDeliveredParcel(new Date());
    const otherShopper = await createBuyer();

    const tooShort = await request(testApp)
      .post(`${LOGISTICS_ORDERS_PATH}/${order.id}/delivery-disputes`)
      .set("Authorization", authHeaderFor(order.userId))
      .send({ shipmentId: shipment.id, details: "no" });
    const notTheirs = await reportNotReceived(otherShopper.id, order.id, shipment.id);

    expect(tooShort.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
    expect(notTheirs.status).toBe(HTTP_STATUS.NOT_FOUND);
  });
});
