import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import {
  FulfilmentMode,
  ItemInspectionStatus,
  PartnerBookingStatus,
  PickupStatus,
  ShipmentStatus,
} from "#generated/prisma/enums.js";
import type { DbClient } from "#types/db.types.js";

const NO_FAILED_UNITS = 0;

const pickupForCheckIn = {
  id: true,
  orderId: true,
  hubId: true,
  pickupStatus: true,
  brand: { select: { name: true } },
  items: { select: { qty: true, refundedQty: true } },
} satisfies Prisma.OrderFulfilmentGroupSelect;

export type PickupForCheckIn = Prisma.OrderFulfilmentGroupGetPayload<{
  select: typeof pickupForCheckIn;
}>;

const orderForPacking = {
  id: true,
  countryCode: true,
  currency: true,
  city: true,
  paymentMethod: true,
  fulfilmentGroups: {
    where: { fulfilmentMode: FulfilmentMode.OUTFIQE_LOGISTICS },
    select: { id: true, hubId: true, pickupStatus: true, shipmentId: true },
  },
  _count: { select: { shipments: true } },
} satisfies Prisma.OrderSelect;

export type OrderForPacking = Prisma.OrderGetPayload<{ select: typeof orderForPacking }>;

export const logisticsHubOperationRepository = {
  async findPickupByBagTagCode(bagTagCode: string): Promise<PickupForCheckIn | null> {
    const bagTag = await prisma.bagTag.findUnique({
      where: { code: bagTagCode },
      select: { fulfilmentGroup: { select: pickupForCheckIn } },
    });
    return bagTag?.fulfilmentGroup ?? null;
  },

  async findPickupByPickupCode(pickupCode: string): Promise<PickupForCheckIn | null> {
    return prisma.orderFulfilmentGroup.findUnique({
      where: { pickupCode },
      select: pickupForCheckIn,
    });
  },

  async findPickupForInspection(groupId: string) {
    return prisma.orderFulfilmentGroup.findUnique({
      where: { id: groupId },
      select: {
        id: true,
        orderId: true,
        hubId: true,
        pickupStatus: true,
        items: {
          select: { id: true, qty: true, refundedQty: true, inspectionStatus: true },
        },
      },
    });
  },

  async recordItemInspections(
    client: DbClient,
    inspections: readonly { orderItemId: string; failedQty: number }[],
  ): Promise<void> {
    for (const { orderItemId, failedQty } of inspections) {
      await client.orderItem.update({
        where: { id: orderItemId },
        data: {
          failedQty,
          inspectionStatus:
            failedQty > NO_FAILED_UNITS ? ItemInspectionStatus.FAILED : ItemInspectionStatus.PASSED,
        },
      });
    }
  },

  async findOrderForPacking(orderId: string): Promise<OrderForPacking | null> {
    return prisma.order.findUnique({ where: { id: orderId }, select: orderForPacking });
  },

  async isTrackingCodeTaken(client: DbClient, trackingCode: string): Promise<boolean> {
    const shipment = await client.shipment.findUnique({
      where: { trackingCode },
      select: { id: true },
    });
    return shipment !== null;
  },

  async createShipment(
    client: DbClient,
    shipment: {
      orderId: string;
      hubId: string;
      trackingCode: string;
      currency: string;
      codAmountToCollect: number;
      weightGrams: number;
      parcelCount: number;
      packedById: string;
    },
  ) {
    return client.shipment.create({ data: shipment, select: { id: true, trackingCode: true } });
  },

  async attachPickupsAtHub(
    client: DbClient,
    params: { fulfilmentGroupIds: readonly string[]; shipmentId: string },
  ): Promise<number> {
    const { count } = await client.orderFulfilmentGroup.updateMany({
      where: {
        id: { in: [...params.fulfilmentGroupIds] },
        pickupStatus: PickupStatus.AT_HUB,
        shipmentId: null,
      },
      data: { shipmentId: params.shipmentId },
    });
    return count;
  },

  async findShipmentByTrackingCode(trackingCode: string) {
    return prisma.shipment.findUnique({
      where: { trackingCode },
      select: { id: true, hubId: true, status: true },
    });
  },

  async findShipmentForMoney(client: DbClient, shipmentId: string) {
    return client.shipment.findUnique({
      where: { id: shipmentId },
      select: {
        id: true,
        orderId: true,
        hubId: true,
        status: true,
        trackingCode: true,
        createdAt: true,
        codAmountToCollect: true,
        labelCodAmount: true,
        fulfilmentGroups: { select: { id: true } },
      },
    });
  },

  async findFirstShipmentIdForOrder(client: DbClient, orderId: string): Promise<string | null> {
    const firstShipment = await client.shipment.findFirst({
      where: { orderId, status: { not: ShipmentStatus.CANCELLED } },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    return firstShipment?.id ?? null;
  },

  async setCodAmountToCollect(
    client: DbClient,
    shipmentId: string,
    codAmountToCollect: number,
  ): Promise<void> {
    await client.shipment.update({ where: { id: shipmentId }, data: { codAmountToCollect } });
  },

  async findParcelForLabel(shipmentId: string) {
    return prisma.shipment.findUnique({
      where: { id: shipmentId },
      select: {
        id: true,
        trackingCode: true,
        status: true,
        currency: true,
        codAmountToCollect: true,
        labelCodAmount: true,
        labelPrintedAt: true,
        weightGrams: true,
        parcelCount: true,
        createdAt: true,
        order: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            phoneE164: true,
            address: true,
            city: true,
            landmark: true,
          },
        },
        hub: { select: { name: true, address: true, city: true, phoneE164: true } },
        bookings: {
          where: { status: { not: PartnerBookingStatus.CANCELLED } },
          select: {
            status: true,
            partnerReference: true,
            partnerLabelUrl: true,
            partner: { select: { name: true } },
          },
        },
      },
    });
  },

  async markLabelPrinted(
    shipmentId: string,
    params: { labelCodAmount: number; labelPrintedAt: Date },
  ): Promise<void> {
    await prisma.shipment.update({ where: { id: shipmentId }, data: params });
  },
};
