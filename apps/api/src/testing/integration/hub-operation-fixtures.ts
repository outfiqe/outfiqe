import { randomUUID } from "node:crypto";

import { subHours } from "date-fns/subHours";
import request from "supertest";

import { HTTP_STATUS, IDEMPOTENCY_HEADER } from "#constants/http.constants.js";
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
  type PartnerApiConnection,
} from "./logistics-fixtures.js";
import { createRefundableOrder } from "./refund-fixtures.js";
import { testApp } from "./test-app.js";

const CUSTOMER_CITY = "Kathmandu";
const HOURS_SINCE_COLLECTION = 1;
const HUB_PATH = "/api/logistics/hub";
const NO_FAILED_UNITS = 0;

type HubOrderLine = { unitPrice: number; qty: number };

type HubPickupFixture = { groupId: string; itemId: string; qty: number; bagTagCode: string };

const expectHubStepSucceeded = (response: request.Response, step: string) => {
  if (response.status !== HTTP_STATUS.OK) {
    throw new Error(`${step} answered ${response.status}: ${JSON.stringify(response.body)}`);
  }
};

export const createStaffForHub = () =>
  createRoleLimitedStaffSession("platform:logistics:manage", "platform:logistics:read");

export const createOrderOnItsWayToHub = async ({
  paymentMethod,
  paymentStatus,
  lines,
  deliveryFee,
  partnerSupportsCod = true,
  referencePattern = null,
  partnerApiConnection = null,
}: {
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  lines: HubOrderLine[];
  deliveryFee?: number;
  partnerSupportsCod?: boolean;
  referencePattern?: string | null;
  partnerApiConnection?: PartnerApiConnection | null;
}) => {
  const { hub, zone } = await createCoveredPickupArea([CUSTOMER_CITY]);
  const partner = await createDeliveryPartnerCovering({
    hubId: hub.id,
    deliveryZoneIds: [zone.id],
    supportsCod: partnerSupportsCod,
    referencePattern,
    apiConnection: partnerApiConnection,
  });
  const { order, buyer, items } = await createRefundableOrder({
    paymentMethod,
    paymentStatus,
    lines: lines.map((line) => ({ ...line, fulfilmentMode: FulfilmentMode.OUTFIQE_LOGISTICS })),
    ...(deliveryFee === undefined ? {} : { deliveryFee }),
  });
  const staff = await createStaffForHub();
  const collectedAt = subHours(new Date(), HOURS_SINCE_COLLECTION);

  const pickups: HubPickupFixture[] = [];
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

export const checkInAndPassEveryBag = async ({
  hub,
  staff,
  pickups,
}: {
  hub: { id: string };
  staff: { authHeader: string };
  pickups: HubPickupFixture[];
}) => {
  for (const { bagTagCode, qty, groupId, itemId } of pickups) {
    expectHubStepSucceeded(
      await request(testApp)
        .post(`${HUB_PATH}/check-ins`)
        .set("Authorization", staff.authHeader)
        .set(IDEMPOTENCY_HEADER, `hub-${randomUUID()}`)
        .send({ hubId: hub.id, code: bagTagCode, countedUnits: qty }),
      "Hub check-in",
    );
    expectHubStepSucceeded(
      await request(testApp)
        .post(`${HUB_PATH}/pickups/${groupId}/inspection`)
        .set("Authorization", staff.authHeader)
        .send({ lines: [{ orderItemId: itemId, failedQty: NO_FAILED_UNITS }] }),
      "Inspection",
    );
  }
};
