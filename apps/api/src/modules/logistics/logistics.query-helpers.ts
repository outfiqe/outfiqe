import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import { ItemInspectionStatus, PickupStatus } from "#generated/prisma/enums.js";

export const ORDER_ITEM_WITH_UNITS_LEFT_WHERE = {
  refundedQty: { lt: prisma.orderItem.fields.qty },
} satisfies Prisma.OrderItemWhereInput;

export const ORDER_ITEM_NOT_INSPECTED_WHERE = {
  inspectionStatus: ItemInspectionStatus.NOT_INSPECTED,
} satisfies Prisma.OrderItemWhereInput;

export const PICKUP_WAITING_TO_PACK_WHERE = {
  pickupStatus: PickupStatus.AT_HUB,
  shipmentId: null,
  items: { some: ORDER_ITEM_WITH_UNITS_LEFT_WHERE },
} satisfies Prisma.OrderFulfilmentGroupWhereInput;

export const PICKUP_READY_TO_PACK_WHERE = {
  ...PICKUP_WAITING_TO_PACK_WHERE,
  items: { some: ORDER_ITEM_WITH_UNITS_LEFT_WHERE, none: ORDER_ITEM_NOT_INSPECTED_WHERE },
} satisfies Prisma.OrderFulfilmentGroupWhereInput;
