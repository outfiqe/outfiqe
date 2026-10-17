import { subHours } from "date-fns/subHours";

import { prisma } from "#db/prisma.js";
import {
  FulfilmentMode,
  FulfilmentStatus,
  type PaymentMethod,
  type PaymentStatus,
  PickupStatus,
} from "#generated/prisma/enums.js";

import { createRoleLimitedStaffSession } from "./auth-helpers.js";
import {
  createBagTag,
  createCoveredPickupArea,
  createDeliveryPartnerCovering,
} from "./logistics-fixtures.js";
import { createRefundableOrder } from "./refund-fixtures.js";

const CUSTOMER_CITY = "Kathmandu";
const HOURS_SINCE_COLLECTION = 1;

type HubOrderLine = { unitPrice: number; qty: number };

export const createStaffForHub = () =>
  createRoleLimitedStaffSession("platform:logistics:manage", "platform:logistics:read");

export const createOrderOnItsWayToHub = async ({
  paymentMethod,
  paymentStatus,
  lines,
  deliveryFee,
  partnerSupportsCod = true,
  referencePattern = null,
}: {
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  lines: HubOrderLine[];
  deliveryFee?: number;
  partnerSupportsCod?: boolean;
  referencePattern?: string | null;
}) => {
  const { hub, zone } = await createCoveredPickupArea([CUSTOMER_CITY]);
  const partner = await createDeliveryPartnerCovering({
    hubId: hub.id,
    deliveryZoneIds: [zone.id],
    supportsCod: partnerSupportsCod,
    referencePattern,
  });
  const { order, buyer, items } = await createRefundableOrder({
    paymentMethod,
    paymentStatus,
    lines: lines.map((line) => ({ ...line, fulfilmentMode: FulfilmentMode.OUTFIQE_LOGISTICS })),
    ...(deliveryFee === undefined ? {} : { deliveryFee }),
  });
  const staff = await createStaffForHub();
  const collectedAt = subHours(new Date(), HOURS_SINCE_COLLECTION);

  const pickups = [];
  for (const { item, group } of items) {
    await prisma.orderFulfilmentGroup.update({
      where: { id: group.id },
      data: {
        hubId: hub.id,
        pickupStatus: PickupStatus.PICKED_UP,
        pickupStatusChangedAt: collectedAt,
        readyForPickupAt: collectedAt,
        pickedUpAt: collectedAt,
        status: FulfilmentStatus.PACKED,
      },
    });
    const bagTag = await createBagTag(hub.id, staff.userId);
    await prisma.bagTag.update({
      where: { id: bagTag.id },
      data: { fulfilmentGroupId: group.id, attachedAt: collectedAt },
    });
    pickups.push({ groupId: group.id, itemId: item.id, qty: item.qty, bagTagCode: bagTag.code });
  }

  return { order, buyer, hub, zone, partner, staff, pickups };
};
