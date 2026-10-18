import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import { PartnerBookingStatus, TrackingEventCode } from "#generated/prisma/enums.js";

import {
  CUSTOMER_NOTICE_EVENT_CODES,
  CUSTOMER_STATUS_EVENT_CODES,
} from "./customer-tracking.constants.js";

const LATEST_BOOKING_ONLY = 1;
const ANY_DISPUTE = 1;

const customerParcelSelect = {
  id: true,
  trackingCode: true,
  status: true,
  deliveredAt: true,
  bookings: {
    where: { status: PartnerBookingStatus.BOOKED },
    orderBy: { bookedAt: "desc" },
    take: LATEST_BOOKING_ONLY,
    select: {
      partnerReference: true,
      partnerTrackingUrl: true,
      partner: { select: { name: true, trackingUrlTemplate: true } },
    },
  },
  trackingEvents: {
    where: { code: TrackingEventCode.DELIVERY_DISPUTED },
    take: ANY_DISPUTE,
    select: { id: true },
  },
} satisfies Prisma.ShipmentSelect;

export type CustomerParcelRecord = Prisma.ShipmentGetPayload<{
  select: typeof customerParcelSelect;
}>;

export const logisticsCustomerTrackingRepository = {
  async findCustomerOrder(userId: string, orderId: string) {
    return prisma.order.findFirst({
      where: { id: orderId, userId },
      select: {
        id: true,
        shipments: { orderBy: { createdAt: "asc" }, select: customerParcelSelect },
      },
    });
  },

  async listCustomerEvents(orderId: string, limit: number) {
    return prisma.trackingEvent.findMany({
      where: {
        AND: [
          { OR: [{ fulfilmentGroup: { orderId } }, { shipment: { orderId } }] },
          {
            OR: [
              { code: { in: CUSTOMER_STATUS_EVENT_CODES }, appliedToStatus: true },
              { code: { in: CUSTOMER_NOTICE_EVENT_CODES } },
            ],
          },
        ],
      },
      orderBy: [{ occurredAt: "desc" }, { receivedAt: "desc" }],
      take: limit,
      select: {
        id: true,
        code: true,
        occurredAt: true,
        location: true,
        reasonCode: true,
        shipmentId: true,
        fulfilmentGroup: { select: { brand: { select: { name: true } } } },
      },
    });
  },

  async findCustomerParcel(userId: string, orderId: string, shipmentId: string) {
    return prisma.shipment.findFirst({
      where: { id: shipmentId, orderId, order: { userId } },
      select: customerParcelSelect,
    });
  },
};
