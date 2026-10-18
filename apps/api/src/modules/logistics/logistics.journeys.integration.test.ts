import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import {
  BrandReturnStatus,
  FulfilmentStatus,
  ParcelReturnOutcome,
  PartnerBookingStatus,
  PartnerClaimStatus,
  PartnerWebhookVerification,
  PaymentMethod,
  PaymentStatus,
  PickupStatus,
  RiderEarningKind,
  ShipmentStatus,
  TrackingEventCode,
} from "#generated/prisma/enums.js";
import { redis } from "#redis/redis.client.js";
import { requireFixtureId } from "#test/integration/logistics-fixtures.js";
import {
  bookByHandAndHandOver,
  bringBagToHub,
  checkInAndInspectBag,
  collectBagWithRider,
  handOverParcel,
  importPartnerStatuses,
  type Journey,
  type JourneyBrand,
  markBagReady,
  packParcel,
  readCustomerTracking,
  startJourney,
} from "#test/integration/logistics-journey.js";
import {
  PARTNER_CREDENTIAL_ENV,
  PARTNER_CREDENTIALS_KEY,
  PARTNER_WEBHOOK_SECRET,
} from "#test/integration/partner-connection-fixtures.js";
import { testApp } from "#test/integration/test-app.js";

import { logisticsPartnerBookingService } from "./partner-bookings/partner-booking.service.js";
import { logisticsPartnerWebhookService } from "./partner-webhooks/partner-webhook.service.js";
import { signPartnerWebhookBody } from "./partner-webhooks/partner-webhook.signature.js";
import { HTTP_JSON_SIGNATURE_HEADER } from "./partners/adapters/http-json.adapter.js";
import { logisticsLostParcelService } from "./returns/lost-parcel.service.js";

const DELIVERY_FEE = 100;
const CONTRACTOR_VISIT_PAY = 70;
const UNITS_ORDERED = 2;
const ONE_UNIT = 1;
const COUPON_DISCOUNT = 200;

const fetchMock = vi.fn<typeof fetch>();

const findOrder = (orderId: string) => prisma.order.findUniqueOrThrow({ where: { id: orderId } });

const findShipment = (shipmentId: string) =>
  prisma.shipment.findUniqueOrThrow({ where: { id: shipmentId } });

const requireBrand = (journey: Journey, brandIndex: number): JourneyBrand => {
  const brand = journey.brands[brandIndex];
  if (!brand) throw new Error(`The journey has no brand ${brandIndex}`);
  return brand;
};

const sumLineTotals = (lines: { unitPrice: number; qty: number }[]) =>
  lines.reduce((total, { unitPrice, qty }) => total + unitPrice * qty, 0);

beforeEach(async () => {
  await redis.flushdb();
  for (const [name, value] of Object.entries(PARTNER_CREDENTIAL_ENV)) vi.stubEnv(name, value);
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("order logistics from brand to customer", () => {
  it("collects three brands, sends one parcel, and settles the cash and rider pay", async () => {
    const lines = [
      { unitPrice: 1200, qty: 1 },
      { unitPrice: 800, qty: 1 },
      { unitPrice: 500, qty: 1 },
    ];
    const journey = await startJourney({
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.DUE,
      deliveryFee: DELIVERY_FEE,
      lines,
    });
    for (const brand of journey.brands) await bringBagToHub(journey, brand);

    const parcel = await packParcel(journey);
    const cashDue = sumLineTotals(lines) + DELIVERY_FEE;
    expect(parcel.codAmountToCollect).toBe(cashDue);
    await bookByHandAndHandOver(journey, parcel, "PX-J1");
    const onItsWay = await readCustomerTracking(journey);
    const delivered = await importPartnerStatuses(journey, [
      { partnerReference: "PX-J1", status: "Delivered", codCollected: cashDue },
    ]);
    const afterDelivery = await readCustomerTracking(journey);

    expect(onItsWay.body.data.stage).toMatchObject({ stage: "ON_ITS_WAY" });
    expect(delivered.body.data).toMatchObject({ appliedCount: 1 });
    expect(afterDelivery.body.data.stage).toMatchObject({ stage: "DELIVERED" });
    expect(await findOrder(journey.order.id)).toMatchObject({
      fulfilmentStatus: FulfilmentStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      deliveredAt: expect.any(Date),
    });
    expect(await findShipment(parcel.shipmentId)).toMatchObject({
      status: ShipmentStatus.DELIVERED,
      codCollectedAmount: cashDue,
    });
    const groups = await prisma.orderFulfilmentGroup.findMany({
      where: { orderId: journey.order.id },
    });
    expect(groups.every(({ shipmentId }) => shipmentId === parcel.shipmentId)).toBe(true);
    const riderEarnings = await prisma.riderEarning.findMany({
      where: { riderId: journey.rider.riderId },
    });
    expect(riderEarnings).toHaveLength(journey.brands.length);
    expect(
      riderEarnings.every(
        ({ kind, amount }) => kind === RiderEarningKind.VISIT && amount === CONTRACTOR_VISIT_PAY,
      ),
    ).toBe(true);
  });

  it("sends a late brand in a second parcel and delivers the order once both arrive", async () => {
    const journey = await startJourney({
      paymentMethod: PaymentMethod.KHALTI,
      paymentStatus: PaymentStatus.PAID,
      lines: [
        { unitPrice: 900, qty: 1 },
        { unitPrice: 700, qty: 1 },
      ],
    });
    const onTimeBrand = requireBrand(journey, 0);
    const lateBrand = requireBrand(journey, 1);

    await bringBagToHub(journey, onTimeBrand);
    const firstParcel = await packParcel(journey, { packsOnlyPickupsAtHub: true });
    await bookByHandAndHandOver(journey, firstParcel, "PX-J2A");
    await importPartnerStatuses(journey, [{ partnerReference: "PX-J2A", status: "Delivered" }]);
    const halfway = await findOrder(journey.order.id);

    await bringBagToHub(journey, lateBrand);
    const secondParcel = await packParcel(journey);
    await bookByHandAndHandOver(journey, secondParcel, "PX-J2B");
    await importPartnerStatuses(journey, [{ partnerReference: "PX-J2B", status: "Delivered" }]);

    expect(firstParcel.shipmentId).not.toBe(secondParcel.shipmentId);
    expect(firstParcel.codAmountToCollect).toBe(0);
    expect(halfway.fulfilmentStatus).not.toBe(FulfilmentStatus.DELIVERED);
    expect(halfway.deliveredAt).toBeNull();
    expect(await findOrder(journey.order.id)).toMatchObject({
      fulfilmentStatus: FulfilmentStatus.DELIVERED,
      deliveredAt: expect.any(Date),
    });
  });

  it("delivers a mixed order only when the brand that ships itself delivers too", async () => {
    const journey = await startJourney({
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.DUE,
      lines: [
        { unitPrice: 1000, qty: 1 },
        { unitPrice: 600, qty: 1, brandShips: true },
      ],
    });
    const hubBrand = requireBrand(journey, 0);
    const selfShippingBrand = requireBrand(journey, 1);

    await bringBagToHub(journey, hubBrand);
    const parcel = await packParcel(journey);
    await bookByHandAndHandOver(journey, parcel, "PX-J3");
    await importPartnerStatuses(journey, [{ partnerReference: "PX-J3", status: "Delivered" }]);
    const beforeBrandDelivers = await findOrder(journey.order.id);
    for (const step of [
      { status: FulfilmentStatus.PACKED },
      { status: FulfilmentStatus.SHIPPED, carrier: "Valley Express", trackingNumber: "VE-1" },
      { status: FulfilmentStatus.DELIVERED },
    ]) {
      const advanced = await request(testApp)
        .patch(`/api/orders/brand/fulfilment-groups/${selfShippingBrand.groupId}`)
        .set("Authorization", selfShippingBrand.owner.authHeader)
        .send(step);
      expect(advanced.status).toBe(HTTP_STATUS.OK);
    }

    expect(beforeBrandDelivers.fulfilmentStatus).not.toBe(FulfilmentStatus.DELIVERED);
    expect(await findOrder(journey.order.id)).toMatchObject({
      fulfilmentStatus: FulfilmentStatus.DELIVERED,
      paymentStatus: PaymentStatus.DUE,
    });
  });
});

describe("parcels that don't make it", () => {
  it("takes a refused parcel back, refunds it, and restocks the brand once it confirms", async () => {
    const journey = await startJourney({
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.DUE,
      lines: [{ unitPrice: 1000, qty: UNITS_ORDERED }],
    });
    const brand = requireBrand(journey, 0);
    await bringBagToHub(journey, brand);
    const parcel = await packParcel(journey);
    await bookByHandAndHandOver(journey, parcel, "PX-J4");
    await importPartnerStatuses(journey, [{ partnerReference: "PX-J4", status: "Returned" }]);
    const stockBefore = (
      await prisma.productSize.findUniqueOrThrow({ where: { id: brand.sizeId } })
    ).stock;

    const checkedIn = await request(testApp)
      .post(`/api/logistics/hub/shipments/${parcel.shipmentId}/return-check-in`)
      .set("Authorization", journey.staff.authHeader)
      .send({
        outcome: ParcelReturnOutcome.CUSTOMER_REFUSED_OR_UNREACHABLE,
        lines: [{ orderItemId: brand.itemId, resellableQty: UNITS_ORDERED, damagedQty: 0 }],
      });
    expect(checkedIn.status).toBe(HTTP_STATUS.OK);
    const brandReturnId = requireFixtureId(checkedIn.body.data.brandReturnIds[0]);

    const visit = await request(testApp)
      .post("/api/logistics/admin/rider-tasks")
      .set("Authorization", journey.staff.authHeader)
      .send({
        riderId: journey.rider.riderId,
        pickupLocationId: requireFixtureId(brand.pickupLocationId ?? undefined),
        brandReturnIds: [brandReturnId],
        roundStartsAt: new Date().toISOString(),
      });
    await request(testApp)
      .post(`/api/logistics/rider/tasks/${requireFixtureId(visit.body.data.id)}/return-drop-offs`)
      .set("Authorization", journey.rider.authHeader)
      .send({ brandReturnId });
    const confirmed = await request(testApp)
      .post(`/api/logistics/brand/returns/${brandReturnId}/confirm`)
      .set("Authorization", brand.owner.authHeader);

    expect(checkedIn.body.data).toMatchObject({ recordedRefusal: true });
    expect(confirmed.body.data.status).toBe(BrandReturnStatus.CONFIRMED);
    expect(await findOrder(journey.order.id)).toMatchObject({
      fulfilmentStatus: FulfilmentStatus.RETURNED,
    });
    expect(
      await prisma.customerDeliveryRefusal.count({ where: { orderId: journey.order.id } }),
    ).toBe(1);
    const stockAfter = (await prisma.productSize.findUniqueOrThrow({ where: { id: brand.sizeId } }))
      .stock;
    expect(stockAfter - stockBefore).toBe(UNITS_ORDERED);
    expect(
      (await prisma.orderFulfilmentGroup.findUniqueOrThrow({ where: { id: brand.groupId } }))
        .pickupStatus,
    ).toBe(PickupStatus.RETURNED_TO_BRAND);
  });

  it("refunds a lost parcel once and opens a claim against the partner", async () => {
    const journey = await startJourney({
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.DUE,
      lines: [{ unitPrice: 1500, qty: 1 }],
    });
    await bringBagToHub(journey, requireBrand(journey, 0));
    const parcel = await packParcel(journey);
    await bookByHandAndHandOver(journey, parcel, "PX-J5");

    const markedLost = await request(testApp)
      .post(`/api/logistics/hub/shipments/${parcel.shipmentId}/events`)
      .set("Authorization", journey.staff.authHeader)
      .send({ code: TrackingEventCode.LOST, note: "Partner says the parcel is missing" });
    await logisticsLostParcelService.settleLostParcel(parcel.shipmentId);
    await logisticsLostParcelService.settleLostParcel(parcel.shipmentId);

    expect(markedLost.status).toBe(HTTP_STATUS.OK);
    expect(await findShipment(parcel.shipmentId)).toMatchObject({
      status: ShipmentStatus.LOST,
      partnerClaimStatus: PartnerClaimStatus.OPEN,
    });
    expect(await prisma.orderRefund.count({ where: { orderId: journey.order.id } })).toBe(1);
  });
});

describe("refunds and partners along the way", () => {
  it("refunds a unit that fails inspection on a coupon order and lowers the cash to collect", async () => {
    const journey = await startJourney({
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.DUE,
      deliveryFee: DELIVERY_FEE,
      lines: [{ unitPrice: 1000, qty: UNITS_ORDERED, platformDiscountAmount: COUPON_DISCOUNT }],
      coupon: { discountAmount: COUPON_DISCOUNT, platformFundedAmount: COUPON_DISCOUNT },
    });
    const brand = requireBrand(journey, 0);
    await markBagReady(brand);
    const { bagTagCode } = await collectBagWithRider(journey, brand);

    await checkInAndInspectBag(journey, brand, bagTagCode, ONE_UNIT);
    const parcel = await packParcel(journey);

    const [refund] = await prisma.orderRefund.findMany({
      where: { orderId: journey.order.id },
      include: { lines: true },
    });
    expect(refund?.lines).toEqual([
      expect.objectContaining({ orderItemId: brand.itemId, qty: ONE_UNIT }),
    ]);
    const item = await prisma.orderItem.findUniqueOrThrow({ where: { id: brand.itemId } });
    expect(item.refundedQty).toBe(ONE_UNIT);
    const redemption = await prisma.couponRedemption.findFirstOrThrow({
      where: { orderId: journey.order.id },
    });
    expect(redemption.releasedAmount).toBeGreaterThan(0);
    expect(parcel.codAmountToCollect).toBeLessThan(
      UNITS_ORDERED * 1000 - COUPON_DISCOUNT + DELIVERY_FEE,
    );
    expect(parcel.codAmountToCollect).toBeGreaterThan(0);
  });

  it("books through a connected partner and delivers on its signed webhook", async () => {
    const journey = await startJourney({
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.DUE,
      lines: [{ unitPrice: 1400, qty: 1 }],
      partnerApiConnection: {
        credentialsKey: PARTNER_CREDENTIALS_KEY,
        webhookVerification: PartnerWebhookVerification.SIGNATURE,
      },
    });
    await bringBagToHub(journey, requireBrand(journey, 0));
    const parcel = await packParcel(journey);
    const booking = await prisma.shipmentPartnerBooking.findFirstOrThrow({
      where: { shipmentId: parcel.shipmentId },
    });
    fetchMock.mockImplementation(async () =>
      Response.json(
        { reference: "PX-API-1", trackingUrl: "https://partner.example/t/PX-API-1" },
        { status: HTTP_STATUS.CREATED },
      ),
    );

    await logisticsPartnerBookingService.processBookingRequest(booking.id);
    await handOverParcel(journey, parcel);
    const body = JSON.stringify({
      events: [
        {
          id: "evt-journey-1",
          reference: "PX-API-1",
          status: "Delivered",
          occurredAt: new Date().toISOString(),
          codCollected: parcel.codAmountToCollect,
        },
      ],
    });
    const webhook = await request(testApp)
      .post(`/api/webhooks/delivery-partners/${journey.partner.code}`)
      .set("Content-Type", "application/json")
      .set(
        HTTP_JSON_SIGNATURE_HEADER,
        signPartnerWebhookBody(Buffer.from(body), PARTNER_WEBHOOK_SECRET),
      )
      .send(body);
    const receipts = await prisma.partnerWebhookReceipt.findMany({
      where: { partnerId: journey.partner.id },
    });
    for (const { id } of receipts) await logisticsPartnerWebhookService.processWebhookReceipt(id);

    expect(
      (await prisma.shipmentPartnerBooking.findUniqueOrThrow({ where: { id: booking.id } })).status,
    ).toBe(PartnerBookingStatus.BOOKED);
    expect(webhook.status).toBe(HTTP_STATUS.OK);
    expect(await findOrder(journey.order.id)).toMatchObject({
      fulfilmentStatus: FulfilmentStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
    });
  });
});
