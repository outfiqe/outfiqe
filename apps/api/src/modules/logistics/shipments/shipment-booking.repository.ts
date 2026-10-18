import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import { type DeliveryPartnerConnection, PartnerBookingStatus } from "#generated/prisma/enums.js";
import type { DbClient } from "#types/db.types.js";

const NOTHING_UPDATED = 0;

const bookingForMatching = {
  id: true,
  status: true,
  shipmentId: true,
  partnerReference: true,
  shipment: { select: { status: true, trackingCode: true } },
} satisfies Prisma.ShipmentPartnerBookingSelect;

export type BookingForMatching = Prisma.ShipmentPartnerBookingGetPayload<{
  select: typeof bookingForMatching;
}>;

export const logisticsShipmentBookingRepository = {
  async findBookingByPartnerReference(
    client: DbClient,
    partnerId: string,
    partnerReference: string,
  ): Promise<BookingForMatching | null> {
    return client.shipmentPartnerBooking.findUnique({
      where: { partnerId_partnerReference: { partnerId, partnerReference } },
      select: bookingForMatching,
    });
  },

  async findLatestBookingForParcel(
    client: DbClient,
    partnerId: string,
    trackingCode: string,
  ): Promise<BookingForMatching | null> {
    return client.shipmentPartnerBooking.findFirst({
      where: { partnerId, shipment: { trackingCode } },
      orderBy: { requestedAt: "desc" },
      select: bookingForMatching,
    });
  },

  async findLiveBookingForShipment(client: DbClient, shipmentId: string) {
    return client.shipmentPartnerBooking.findFirst({
      where: { shipmentId, status: { not: PartnerBookingStatus.CANCELLED } },
      include: { partner: { select: { name: true, referencePattern: true, code: true } } },
    });
  },

  async countBookingsWithPartner(client: DbClient, shipmentId: string, partnerId: string) {
    return client.shipmentPartnerBooking.count({ where: { shipmentId, partnerId } });
  },

  async createBooking(
    client: DbClient,
    booking: {
      shipmentId: string;
      partnerId: string;
      partnerAccountId: string;
      merchantReference: string;
      connection: DeliveryPartnerConnection;
      requestedById: string;
    },
  ) {
    return client.shipmentPartnerBooking.create({ data: booking, select: { id: true } });
  },

  async markBookingBooked(
    client: DbClient,
    params: { bookingId: string; partnerReference: string; bookedById: string; bookedAt: Date },
  ): Promise<boolean> {
    const { count } = await client.shipmentPartnerBooking.updateMany({
      where: {
        id: params.bookingId,
        status: { in: [PartnerBookingStatus.REQUESTED, PartnerBookingStatus.BOOKING_FAILED] },
      },
      data: {
        status: PartnerBookingStatus.BOOKED,
        partnerReference: params.partnerReference,
        bookedById: params.bookedById,
        bookedAt: params.bookedAt,
        failureReason: null,
      },
    });
    return count > NOTHING_UPDATED;
  },

  async cancelLiveBooking(
    client: DbClient,
    params: { bookingId: string; cancelReason: string; cancelledAt: Date },
  ): Promise<boolean> {
    const { count } = await client.shipmentPartnerBooking.updateMany({
      where: { id: params.bookingId, status: { not: PartnerBookingStatus.CANCELLED } },
      data: {
        status: PartnerBookingStatus.CANCELLED,
        cancelReason: params.cancelReason,
        cancelledAt: params.cancelledAt,
      },
    });
    return count > NOTHING_UPDATED;
  },

  async listActivePartnerChoices(
    params: { hubId: string; deliveryZoneId: string; requiresCod: boolean },
    client: DbClient = prisma,
  ) {
    return client.deliveryPartnerZone.findMany({
      where: {
        hubId: params.hubId,
        deliveryZoneId: params.deliveryZoneId,
        isActive: true,
        partner: {
          isActive: true,
          ...(params.requiresCod ? { supportsCod: true } : {}),
          accounts: { some: { hubId: params.hubId, isActive: true } },
        },
      },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      select: {
        partner: {
          select: {
            id: true,
            name: true,
            adapterKey: true,
            accounts: { where: { hubId: params.hubId, isActive: true }, select: { id: true } },
          },
        },
      },
    });
  },
};
