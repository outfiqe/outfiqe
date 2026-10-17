import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import { PartnerBookingStatus, PickupStatus, ShipmentStatus } from "#generated/prisma/enums.js";

import { SHIPMENT_STATUSES_WITH_PARTNER } from "../logistics.constants.js";
import { SHIPMENT_QUEUE, type ShipmentQueue } from "./shipment.schemas.js";

const PAGE_LOOKAHEAD = 1;

const LIVE_BOOKING_WHERE = {
  status: { not: PartnerBookingStatus.CANCELLED },
} satisfies Prisma.ShipmentPartnerBookingWhereInput;

const FINISHED_STATUSES = [
  ShipmentStatus.DELIVERED,
  ShipmentStatus.RETURNED_TO_HUB,
  ShipmentStatus.CANCELLED,
  ShipmentStatus.LOST,
];

const QUEUE_WHERE: Readonly<Record<ShipmentQueue, Prisma.ShipmentWhereInput>> = {
  [SHIPMENT_QUEUE.TO_BOOK]: {
    status: ShipmentStatus.PACKED,
    bookings: { none: { status: PartnerBookingStatus.BOOKED } },
  },
  [SHIPMENT_QUEUE.TO_HAND_OVER]: {
    status: ShipmentStatus.PACKED,
    bookings: { some: { status: PartnerBookingStatus.BOOKED } },
  },
  [SHIPMENT_QUEUE.WITH_PARTNER]: { status: { in: SHIPMENT_STATUSES_WITH_PARTNER } },
  [SHIPMENT_QUEUE.FINISHED]: { status: { in: FINISHED_STATUSES } },
};

const shipmentSummarySelect = {
  id: true,
  orderId: true,
  trackingCode: true,
  status: true,
  codAmountToCollect: true,
  labelCodAmount: true,
  createdAt: true,
  lastEventAt: true,
  order: { select: { fullName: true, city: true } },
  bookings: {
    where: LIVE_BOOKING_WHERE,
    select: {
      id: true,
      partnerId: true,
      status: true,
      connection: true,
      merchantReference: true,
      partnerReference: true,
      partnerTrackingUrl: true,
      failureReason: true,
      partner: { select: { name: true } },
    },
  },
} satisfies Prisma.ShipmentSelect;

export type ShipmentSummaryRecord = Prisma.ShipmentGetPayload<{
  select: typeof shipmentSummarySelect;
}>;

const shipmentDetailSelect = {
  ...shipmentSummarySelect,
  hubId: true,
  currency: true,
  weightGrams: true,
  parcelCount: true,
  deliveryAttemptCount: true,
  deliveredAt: true,
  labelPrintedAt: true,
  returnOutcome: true,
  returnCheckedInAt: true,
  partnerClaimAmount: true,
  partnerClaimStatus: true,
  fulfilmentGroups: {
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      brand: { select: { name: true } },
      items: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          qty: true,
          refundedQty: true,
          product: { select: { name: true } },
          size: { select: { label: true } },
        },
      },
    },
  },
  trackingEvents: {
    orderBy: [{ occurredAt: "desc" }, { receivedAt: "desc" }],
    select: {
      id: true,
      code: true,
      source: true,
      rawStatus: true,
      reasonCode: true,
      note: true,
      occurredAt: true,
      appliedToStatus: true,
      partner: { select: { name: true } },
      actorUser: { select: { name: true } },
    },
  },
} satisfies Prisma.ShipmentSelect;

export type ShipmentDetailRecord = Prisma.ShipmentGetPayload<{
  select: typeof shipmentDetailSelect;
}>;

const orderToPackSelect = {
  id: true,
  createdAt: true,
  fullName: true,
  city: true,
  paymentMethod: true,
  fulfilmentGroups: {
    where: { pickupStatus: { not: null } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      hubId: true,
      pickupStatus: true,
      shipmentId: true,
      brand: { select: { name: true } },
      items: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          qty: true,
          refundedQty: true,
          inspectionStatus: true,
          failedQty: true,
          product: { select: { name: true } },
          size: { select: { label: true } },
        },
      },
    },
  },
} satisfies Prisma.OrderSelect;

export type OrderToPackRecord = Prisma.OrderGetPayload<{ select: typeof orderToPackSelect }>;

export const logisticsShipmentRepository = {
  async listShipmentsForHub(params: {
    hubId: string;
    queue: ShipmentQueue;
    cursor?: string;
    limit: number;
  }): Promise<ShipmentSummaryRecord[]> {
    return prisma.shipment.findMany({
      where: { hubId: params.hubId, ...QUEUE_WHERE[params.queue] },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: params.limit + PAGE_LOOKAHEAD,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: PAGE_LOOKAHEAD } : {}),
      select: shipmentSummarySelect,
    });
  },

  async findShipmentDetail(shipmentId: string): Promise<ShipmentDetailRecord | null> {
    return prisma.shipment.findUnique({ where: { id: shipmentId }, select: shipmentDetailSelect });
  },

  async listOrdersToPack(params: {
    hubId: string;
    cursor?: string;
    limit: number;
  }): Promise<OrderToPackRecord[]> {
    return prisma.order.findMany({
      where: {
        fulfilmentGroups: {
          some: { hubId: params.hubId, pickupStatus: PickupStatus.AT_HUB, shipmentId: null },
        },
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: params.limit + PAGE_LOOKAHEAD,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: PAGE_LOOKAHEAD } : {}),
      select: orderToPackSelect,
    });
  },
};
