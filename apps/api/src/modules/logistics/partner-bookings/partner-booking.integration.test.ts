import { subHours } from "date-fns/subHours";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import {
  DeliveryPartnerConnection,
  PartnerBookingStatus,
  PartnerWebhookVerification,
  PaymentMethod,
  PaymentStatus,
  ShipmentStatus,
  TrackingEventCode,
} from "#generated/prisma/enums.js";
import { OUTBOX_TOPIC } from "#outbox/outbox.constants.js";
import {
  checkInAndPassEveryBag,
  createOrderOnItsWayToHub,
  createStaffForHub,
} from "#test/integration/hub-operation-fixtures.js";
import {
  createParcelWithApiPartner,
  PARTNER_CREDENTIAL_ENV,
  PARTNER_CREDENTIALS_KEY,
} from "#test/integration/partner-connection-fixtures.js";
import { testApp } from "#test/integration/test-app.js";

import { logisticsPartnerBookingService } from "./partner-booking.service.js";
import { MAX_AUTOMATIC_BOOKING_ATTEMPTS } from "./partner-booking.utils.js";

const HUB_PATH = "/api/logistics/hub";
const ATTEMPTS_BEFORE_LAST = MAX_AUTOMATIC_BOOKING_ATTEMPTS - 1;
const HOURS_SINCE_REQUESTED = 2;

const fetchMock = vi.fn<typeof fetch>();

const replyWith = (body: unknown, status: number = HTTP_STATUS.OK) =>
  fetchMock.mockImplementation(async () => Response.json(body, { status }));

const findBooking = (bookingId: string) =>
  prisma.shipmentPartnerBooking.findUniqueOrThrow({ where: { id: bookingId } });

const createWaitingBooking = () =>
  createParcelWithApiPartner({
    shipmentStatus: ShipmentStatus.PACKED,
    bookingStatus: PartnerBookingStatus.REQUESTED,
  });

beforeEach(() => {
  for (const [name, value] of Object.entries(PARTNER_CREDENTIAL_ENV)) vi.stubEnv(name, value);
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("booking parcels with a connected partner", () => {
  it("queues the booking in the same step as packing", async () => {
    const { order, hub, pickups, staff } = await createOrderOnItsWayToHub({
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.DUE,
      lines: [{ unitPrice: 1500, qty: 1 }],
      partnerApiConnection: {
        credentialsKey: PARTNER_CREDENTIALS_KEY,
        webhookVerification: PartnerWebhookVerification.SIGNATURE,
      },
    });
    await checkInAndPassEveryBag({ hub, staff, pickups });

    const packed = await request(testApp)
      .post(`${HUB_PATH}/orders/${order.id}/parcels`)
      .set("Authorization", staff.authHeader)
      .send({ weightGrams: 900, parcelCount: 1 });

    expect(packed.status).toBe(HTTP_STATUS.CREATED);
    const { booking } = packed.body.data;
    expect(booking).toMatchObject({
      status: PartnerBookingStatus.REQUESTED,
      connection: DeliveryPartnerConnection.API,
    });
    const queuedBooking = await prisma.outboxEvent.findFirst({
      where: { topic: OUTBOX_TOPIC.LOGISTICS_PARTNER_BOOKING_REQUESTED },
    });
    expect(queuedBooking?.aggregateId).toBe(booking.bookingId);
  });

  it("books the parcel and records the partner's number once", async () => {
    const { booking, shipment } = await createWaitingBooking();
    replyWith(
      { reference: "PX-777", trackingUrl: "https://partner.example/t/PX-777" },
      HTTP_STATUS.CREATED,
    );

    await logisticsPartnerBookingService.processBookingRequest(booking.id);
    await logisticsPartnerBookingService.processBookingRequest(booking.id);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const sentBooking = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(sentBooking).toMatchObject({
      idempotencyKey: booking.id,
      merchantReference: shipment.trackingCode,
    });
    expect(await findBooking(booking.id)).toMatchObject({
      status: PartnerBookingStatus.BOOKED,
      partnerReference: "PX-777",
      partnerTrackingUrl: "https://partner.example/t/PX-777",
      bookingAttempts: 1,
    });
    expect(
      await prisma.trackingEvent.count({
        where: { shipmentId: shipment.id, code: TrackingEventCode.BOOKING_CONFIRMED },
      }),
    ).toBe(1);
  });

  it("tries again after a partner outage and marks the booking failed after the last try", async () => {
    const { booking, shipment } = await createWaitingBooking();
    replyWith({}, HTTP_STATUS.SERVICE_UNAVAILABLE);

    await expect(
      logisticsPartnerBookingService.processBookingRequest(booking.id),
    ).rejects.toThrow();
    expect(await findBooking(booking.id)).toMatchObject({
      status: PartnerBookingStatus.REQUESTED,
      bookingAttempts: 1,
    });

    await prisma.shipmentPartnerBooking.update({
      where: { id: booking.id },
      data: { bookingAttempts: ATTEMPTS_BEFORE_LAST },
    });
    await logisticsPartnerBookingService.processBookingRequest(booking.id);

    const failedBooking = await findBooking(booking.id);
    expect(failedBooking.status).toBe(PartnerBookingStatus.BOOKING_FAILED);
    expect(failedBooking.failureReason).toBe("The partner answered 503.");
    expect(
      await prisma.trackingEvent.count({
        where: { shipmentId: shipment.id, code: TrackingEventCode.BOOKING_FAILED },
      }),
    ).toBe(1);
  });

  it("marks the booking failed straight away when the partner refuses it", async () => {
    const { booking } = await createWaitingBooking();
    replyWith({ error: "bad city" }, HTTP_STATUS.UNPROCESSABLE_ENTITY);

    await logisticsPartnerBookingService.processBookingRequest(booking.id);

    expect(await findBooking(booking.id)).toMatchObject({
      status: PartnerBookingStatus.BOOKING_FAILED,
      bookingAttempts: 1,
    });
  });

  it("lets staff try a failed booking again, looking the parcel up before booking twice", async () => {
    const { booking, shipment } = await createParcelWithApiPartner({
      shipmentStatus: ShipmentStatus.PACKED,
      bookingStatus: PartnerBookingStatus.BOOKING_FAILED,
    });
    await prisma.shipmentPartnerBooking.update({
      where: { id: booking.id },
      data: {
        lastAttemptAt: subHours(new Date(), HOURS_SINCE_REQUESTED),
        failureReason: "Timed out",
      },
    });
    const staff = await createStaffForHub();

    const retried = await request(testApp)
      .post(`${HUB_PATH}/shipments/${shipment.id}/booking/retry`)
      .set("Authorization", staff.authHeader);

    expect(retried.status).toBe(HTTP_STATUS.OK);
    expect(retried.body.data).toMatchObject({
      status: PartnerBookingStatus.REQUESTED,
      failureReason: null,
    });
    expect(
      await prisma.outboxEvent.count({
        where: { topic: OUTBOX_TOPIC.LOGISTICS_PARTNER_BOOKING_REQUESTED, aggregateId: booking.id },
      }),
    ).toBe(1);

    replyWith({ shipments: [{ reference: "PX-FOUND" }] });
    await logisticsPartnerBookingService.processBookingRequest(booking.id);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBeUndefined();
    expect(await findBooking(booking.id)).toMatchObject({
      status: PartnerBookingStatus.BOOKED,
      partnerReference: "PX-FOUND",
    });

    const retriedAgain = await request(testApp)
      .post(`${HUB_PATH}/shipments/${shipment.id}/booking/retry`)
      .set("Authorization", staff.authHeader);
    expect(retriedAgain.status).toBe(HTTP_STATUS.CONFLICT);
  });

  it("won't take a typed partner number while the booking is still being made", async () => {
    const { shipment } = await createWaitingBooking();
    const staff = await createStaffForHub();

    const typedBooking = await request(testApp)
      .post(`${HUB_PATH}/shipments/${shipment.id}/booking`)
      .set("Authorization", staff.authHeader)
      .send({ partnerReference: "PX-TYPED" });

    expect(typedBooking.status).toBe(HTTP_STATUS.CONFLICT);
    expect(typedBooking.body.code).toBe("BOOKING_IN_PROGRESS");
  });

  it("closes a booking that never finished so staff can see it and try again", async () => {
    const { booking } = await createWaitingBooking();
    await prisma.shipmentPartnerBooking.update({
      where: { id: booking.id },
      data: { requestedAt: subHours(new Date(), HOURS_SINCE_REQUESTED) },
    });

    await logisticsPartnerBookingService.sweepStuckBookings();

    expect(await findBooking(booking.id)).toMatchObject({
      status: PartnerBookingStatus.BOOKING_FAILED,
      failureReason: "The partner didn't confirm this booking in time.",
    });
  });
});
