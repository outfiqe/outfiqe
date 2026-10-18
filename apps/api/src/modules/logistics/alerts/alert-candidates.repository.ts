import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import {
  FulfilmentMode,
  FulfilmentStatus,
  LogisticsAlertType,
  PartnerBookingStatus,
  PickupStatus,
  RiderStopDirection,
  RiderTaskStatus,
  ShipmentStatus,
} from "#generated/prisma/enums.js";

import { SHIPMENT_STATUSES_WITH_PARTNER } from "../logistics.constants.js";

const ALERT_SCAN_BATCH_SIZE = 200;
const NO_CASH = 0;

export const OPEN_RIDER_TASK_STATUSES = [RiderTaskStatus.ASSIGNED, RiderTaskStatus.IN_PROGRESS];
export const SETTLED_ORDER_STATUSES = [
  FulfilmentStatus.DELIVERED,
  FulfilmentStatus.CANCELLED,
  FulfilmentStatus.RETURNED,
];
export const CLOSED_GROUP_STATUSES = [FulfilmentStatus.CANCELLED, FulfilmentStatus.RETURNED];
export const SHIPMENT_STATUSES_ON_TIME_FOR_PROMISE = [
  ShipmentStatus.OUT_FOR_DELIVERY,
  ShipmentStatus.DELIVERED,
];

const hubCalendarSelect = {
  timeZone: true,
  workingDays: true,
  partnerCollectionTime: true,
} satisfies Prisma.HubSelect;

const withoutOpenAlert = (alertType: LogisticsAlertType) => ({
  logisticsAlerts: { none: { alertType, resolvedAt: null } },
});

const withoutAnyAlert = (alertType: LogisticsAlertType) => ({
  logisticsAlerts: { none: { alertType } },
});

const groupForAlertSelect = {
  id: true,
  orderId: true,
  brandId: true,
  hubId: true,
  pickupStatusChangedAt: true,
  atHubAt: true,
  createdAt: true,
  hub: { select: hubCalendarSelect },
} satisfies Prisma.OrderFulfilmentGroupSelect;

export type GroupForAlert = Prisma.OrderFulfilmentGroupGetPayload<{
  select: typeof groupForAlertSelect;
}>;

const shipmentForAlertSelect = {
  id: true,
  orderId: true,
  hubId: true,
  status: true,
  statusChangedAt: true,
  lastEventAt: true,
  deliveredAt: true,
  hub: { select: hubCalendarSelect },
  bookings: {
    where: { status: PartnerBookingStatus.BOOKED },
    select: { id: true, partner: { select: { codRemittanceDays: true } } },
    take: 1,
  },
} satisfies Prisma.ShipmentSelect;

export type ShipmentForAlert = Prisma.ShipmentGetPayload<{
  select: typeof shipmentForAlertSelect;
}>;

const hubOrderGroupWhere = {
  fulfilmentMode: FulfilmentMode.OUTFIQE_LOGISTICS,
  status: { notIn: CLOSED_GROUP_STATUSES },
} satisfies Prisma.OrderFulfilmentGroupWhereInput;

const orderForPromiseSelect = {
  id: true,
  userId: true,
  countryCode: true,
  promisedDeliveryBy: true,
} satisfies Prisma.OrderSelect;

export type OrderForPromise = Prisma.OrderGetPayload<{ select: typeof orderForPromiseSelect }>;

export const logisticsAlertCandidatesRepository = {
  async listGroupsAwaitingBrand(
    alertType: LogisticsAlertType,
    waitingSince: Date,
  ): Promise<GroupForAlert[]> {
    return prisma.orderFulfilmentGroup.findMany({
      where: {
        fulfilmentMode: FulfilmentMode.OUTFIQE_LOGISTICS,
        pickupStatus: PickupStatus.AWAITING_BRAND,
        pickupStatusChangedAt: { lte: waitingSince },
        hubId: { not: null },
        ...withoutAnyAlert(alertType),
      },
      orderBy: { pickupStatusChangedAt: "asc" },
      take: ALERT_SCAN_BATCH_SIZE,
      select: groupForAlertSelect,
    });
  },

  async listMissedRoundStops(roundStartedBefore: Date) {
    return prisma.riderTaskStop.findMany({
      where: {
        isActive: true,
        scannedAt: null,
        direction: RiderStopDirection.COLLECT,
        riderTask: {
          status: { in: OPEN_RIDER_TASK_STATUSES },
          roundStartsAt: { lte: roundStartedBefore },
        },
        fulfilmentGroup: withoutOpenAlert(LogisticsAlertType.MISSED_ROUND),
      },
      orderBy: { riderTask: { roundStartsAt: "asc" } },
      take: ALERT_SCAN_BATCH_SIZE,
      select: {
        riderTaskId: true,
        fulfilmentGroup: { select: { id: true, orderId: true, brandId: true, hubId: true } },
      },
    });
  },

  async listGroupsWaitingAtHub(arrivedBefore: Date): Promise<GroupForAlert[]> {
    return prisma.orderFulfilmentGroup.findMany({
      where: {
        fulfilmentMode: FulfilmentMode.OUTFIQE_LOGISTICS,
        pickupStatus: PickupStatus.AT_HUB,
        shipmentId: null,
        atHubAt: { lte: arrivedBefore },
        ...withoutAnyAlert(LogisticsAlertType.WAITING_AT_HUB),
      },
      orderBy: { atHubAt: "asc" },
      take: ALERT_SCAN_BATCH_SIZE,
      select: groupForAlertSelect,
    });
  },

  async listBookedParcelsAtHub(packedBefore: Date): Promise<ShipmentForAlert[]> {
    return prisma.shipment.findMany({
      where: {
        status: ShipmentStatus.PACKED,
        statusChangedAt: { lte: packedBefore },
        bookings: { some: { status: PartnerBookingStatus.BOOKED } },
        ...withoutOpenAlert(LogisticsAlertType.PARTNER_NOT_COLLECTED),
      },
      orderBy: { statusChangedAt: "asc" },
      take: ALERT_SCAN_BATCH_SIZE,
      select: shipmentForAlertSelect,
    });
  },

  async listQuietParcels(lastEventBefore: Date): Promise<ShipmentForAlert[]> {
    return prisma.shipment.findMany({
      where: {
        status: { in: SHIPMENT_STATUSES_WITH_PARTNER },
        lastEventAt: { lte: lastEventBefore },
        ...withoutOpenAlert(LogisticsAlertType.NO_PARTNER_UPDATE),
      },
      orderBy: { lastEventAt: "asc" },
      take: ALERT_SCAN_BATCH_SIZE,
      select: shipmentForAlertSelect,
    });
  },

  async listUnremittedCashParcels(deliveredBefore: Date): Promise<ShipmentForAlert[]> {
    return prisma.shipment.findMany({
      where: {
        status: ShipmentStatus.DELIVERED,
        codCollectedAmount: { gt: NO_CASH },
        codRemittanceLine: { is: null },
        deliveredAt: { lte: deliveredBefore },
        bookings: { some: { status: PartnerBookingStatus.BOOKED } },
        ...withoutAnyAlert(LogisticsAlertType.COD_REMITTANCE_OVERDUE),
      },
      orderBy: { deliveredAt: "asc" },
      take: ALERT_SCAN_BATCH_SIZE,
      select: shipmentForAlertSelect,
    });
  },

  async listOrdersWithPromiseNotOutYet(promisedBy: Date): Promise<OrderForPromise[]> {
    return prisma.order.findMany({
      where: {
        promisedDeliveryBy: { lte: promisedBy },
        fulfilmentStatus: { notIn: SETTLED_ORDER_STATUSES },
        fulfilmentGroups: {
          some: {
            ...hubOrderGroupWhere,
            OR: [
              { shipmentId: null },
              { shipment: { status: { notIn: SHIPMENT_STATUSES_ON_TIME_FOR_PROMISE } } },
            ],
          },
        },
        ...withoutAnyAlert(LogisticsAlertType.PROMISE_AT_RISK),
      },
      orderBy: { promisedDeliveryBy: "asc" },
      take: ALERT_SCAN_BATCH_SIZE,
      select: orderForPromiseSelect,
    });
  },

  async listOrdersNotDeliveredByPromise(promisedBy: Date): Promise<OrderForPromise[]> {
    return prisma.order.findMany({
      where: {
        promisedDeliveryBy: { lte: promisedBy },
        fulfilmentStatus: { notIn: SETTLED_ORDER_STATUSES },
        fulfilmentGroups: { some: hubOrderGroupWhere },
        ...withoutAnyAlert(LogisticsAlertType.PROMISE_MISSED),
      },
      orderBy: { promisedDeliveryBy: "asc" },
      take: ALERT_SCAN_BATCH_SIZE,
      select: orderForPromiseSelect,
    });
  },
};
