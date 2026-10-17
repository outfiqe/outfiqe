import { subHours } from "date-fns/subHours";

import { prisma } from "#db/prisma.js";
import {
  FulfilmentMode,
  type PaymentMethod,
  type PaymentStatus,
  ShipmentStatus,
} from "#generated/prisma/enums.js";

import { createStaffForHub } from "./hub-operation-fixtures.js";
import { createHub, packGroupsIntoParcel } from "./logistics-fixtures.js";
import { createRefundableOrder } from "./refund-fixtures.js";

const HOURS_SINCE_LAST_MOVE = 1;

type ReturnOrderLine = { unitPrice: number; qty: number };

export const createParcelOnItsWayBack = async ({
  paymentMethod,
  paymentStatus,
  lines,
  shipmentStatus = ShipmentStatus.RETURNING,
  deliveryFee,
}: {
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  lines: ReturnOrderLine[];
  shipmentStatus?: ShipmentStatus;
  deliveryFee?: number;
}) => {
  const { order, buyer, items } = await createRefundableOrder({
    paymentMethod,
    paymentStatus,
    lines: lines.map((line) => ({ ...line, fulfilmentMode: FulfilmentMode.OUTFIQE_LOGISTICS })),
    ...(deliveryFee === undefined ? {} : { deliveryFee }),
  });
  const hub = await createHub();
  const fulfilmentGroupIds = items.map(({ group }) => group.id);
  const lastMovedAt = subHours(new Date(), HOURS_SINCE_LAST_MOVE);
  await prisma.orderFulfilmentGroup.updateMany({
    where: { id: { in: fulfilmentGroupIds } },
    data: { hubId: hub.id },
  });
  const shipment = await packGroupsIntoParcel(order.id, hub.id, fulfilmentGroupIds);
  await prisma.orderFulfilmentGroup.updateMany({
    where: { id: { in: fulfilmentGroupIds } },
    data: { pickupStatusChangedAt: lastMovedAt },
  });
  await prisma.shipment.update({
    where: { id: shipment.id },
    data: { status: shipmentStatus, statusChangedAt: lastMovedAt },
  });
  const staff = await createStaffForHub();
  return { order, buyer, hub, shipment, items, staff };
};
