import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import { DeliveryPartnerConnection, PartnerBookingStatus } from "#generated/prisma/enums.js";
import type { DbClient } from "#types/db.types.js";

const NOTHING_UPDATED = 0;
const ATTEMPT_STEP = 1;
const NO_ATTEMPTS = 0;

const partnerAccountForAdapterSelect = {
  id: true,
  hubId: true,
  merchantAccountRef: true,
  pickupPointRef: true,
  credentialsKey: true,
} satisfies Prisma.DeliveryPartnerAccountSelect;

const bookingForApiRequestSelect = {
  id: true,
  status: true,
  connection: true,
  merchantReference: true,
  bookingAttempts: true,
  lastAttemptAt: true,
  partnerId: true,
  shipmentId: true,
  partner: { select: { id: true, code: true, name: true, adapterKey: true } },
  partnerAccount: { select: partnerAccountForAdapterSelect },
  shipment: {
    select: {
      currency: true,
      codAmountToCollect: true,
      weightGrams: true,
      parcelCount: true,
      hub: {
        select: { name: true, phoneE164: true, address: true, city: true, countryCode: true },
      },
      order: {
        select: {
          fullName: true,
          phone: true,
          phoneE164: true,
          address: true,
          landmark: true,
          city: true,
          region: true,
          postalCode: true,
          countryCode: true,
        },
      },
      fulfilmentGroups: {
        select: { items: { select: { qty: true, refundedQty: true, unitPrice: true } } },
      },
    },
  },
} satisfies Prisma.ShipmentPartnerBookingSelect;

export type BookingForApiRequest = Prisma.ShipmentPartnerBookingGetPayload<{
  select: typeof bookingForApiRequestSelect;
}>;

const API_BOOKING_WAITING_WHERE = {
  status: PartnerBookingStatus.REQUESTED,
  connection: DeliveryPartnerConnection.API,
} satisfies Prisma.ShipmentPartnerBookingWhereInput;

export const logisticsPartnerBookingRepository = {
  async findBookingForApiRequest(bookingId: string): Promise<BookingForApiRequest | null> {
    return prisma.shipmentPartnerBooking.findUnique({
      where: { id: bookingId },
      select: bookingForApiRequestSelect,
    });
  },

  async findShipmentStatus(shipmentId: string) {
    return prisma.shipment.findUnique({ where: { id: shipmentId }, select: { status: true } });
  },

  async claimBookingAttempt(bookingId: string, attemptedAt: Date): Promise<boolean> {
    const { count } = await prisma.shipmentPartnerBooking.updateMany({
      where: { id: bookingId, ...API_BOOKING_WAITING_WHERE },
      data: { bookingAttempts: { increment: ATTEMPT_STEP }, lastAttemptAt: attemptedAt },
    });
    return count > NOTHING_UPDATED;
  },

  async recordAttemptError(bookingId: string, failureReason: string): Promise<void> {
    await prisma.shipmentPartnerBooking.updateMany({
      where: { id: bookingId, ...API_BOOKING_WAITING_WHERE },
      data: { failureReason },
    });
  },

  async markBookingFailed(
    client: DbClient,
    params: { bookingId: string; failureReason: string },
  ): Promise<boolean> {
    const { count } = await client.shipmentPartnerBooking.updateMany({
      where: { id: params.bookingId, ...API_BOOKING_WAITING_WHERE },
      data: { status: PartnerBookingStatus.BOOKING_FAILED, failureReason: params.failureReason },
    });
    return count > NOTHING_UPDATED;
  },

  async markBookingBookedByPartner(
    client: DbClient,
    params: {
      bookingId: string;
      partnerReference: string;
      partnerLabelUrl: string | null;
      partnerTrackingUrl: string | null;
      bookedAt: Date;
    },
  ): Promise<boolean> {
    const { count } = await client.shipmentPartnerBooking.updateMany({
      where: {
        id: params.bookingId,
        connection: DeliveryPartnerConnection.API,
        status: { in: [PartnerBookingStatus.REQUESTED, PartnerBookingStatus.BOOKING_FAILED] },
      },
      data: {
        status: PartnerBookingStatus.BOOKED,
        partnerReference: params.partnerReference,
        partnerLabelUrl: params.partnerLabelUrl,
        partnerTrackingUrl: params.partnerTrackingUrl,
        bookedAt: params.bookedAt,
        failureReason: null,
      },
    });
    return count > NOTHING_UPDATED;
  },

  async requeueFailedBooking(
    client: DbClient,
    params: { bookingId: string; requestedById: string; requestedAt: Date },
  ): Promise<boolean> {
    const { count } = await client.shipmentPartnerBooking.updateMany({
      where: {
        id: params.bookingId,
        status: PartnerBookingStatus.BOOKING_FAILED,
        connection: DeliveryPartnerConnection.API,
      },
      data: {
        status: PartnerBookingStatus.REQUESTED,
        bookingAttempts: NO_ATTEMPTS,
        failureReason: null,
        requestedById: params.requestedById,
        requestedAt: params.requestedAt,
      },
    });
    return count > NOTHING_UPDATED;
  },

  async listStuckBookingIds(params: { stuckBefore: Date; limit: number }): Promise<string[]> {
    const stuckBookings = await prisma.shipmentPartnerBooking.findMany({
      where: {
        ...API_BOOKING_WAITING_WHERE,
        requestedAt: { lt: params.stuckBefore },
        OR: [{ lastAttemptAt: null }, { lastAttemptAt: { lt: params.stuckBefore } }],
      },
      orderBy: { requestedAt: "asc" },
      take: params.limit,
      select: { id: true },
    });
    return stuckBookings.map(({ id }) => id);
  },
};
