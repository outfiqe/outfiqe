import { randomUUID } from "node:crypto";

import request from "supertest";

import { HTTP_STATUS, IDEMPOTENCY_HEADER } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import {
  FulfilmentMode,
  type PaymentMethod,
  type PaymentStatus,
  UserRole,
} from "#generated/prisma/enums.js";

import { createStaffForHub } from "./hub-operation-fixtures.js";
import {
  createBagTag,
  createCoveredPickupArea,
  createDefaultPickupLocation,
  createDeliveryPartnerCovering,
  createRiderSession,
  type PartnerApiConnection,
  requireFixtureId,
} from "./logistics-fixtures.js";
import { createOwnerSessionForBrand, createRefundableOrder } from "./refund-fixtures.js";
import { testApp } from "./test-app.js";
import { authHeaderFor } from "./withdraw-fixtures.js";

const CUSTOMER_CITY = "Kathmandu";
const PARCEL_WEIGHT_GRAMS = 900;
const SINGLE_PACKAGE = 1;
const NO_FAILED_UNITS = 0;

const HUB_PATH = "/api/logistics/hub";
const RIDER_TASKS_PATH = "/api/logistics/rider/tasks";
const ADMIN_TASKS_PATH = "/api/logistics/admin/rider-tasks";

type JourneyLine = {
  unitPrice: number;
  qty: number;
  brandShips?: boolean;
  platformDiscountAmount?: number;
};

const withKey = (prefix: string) => `${prefix}-${randomUUID()}`;

const expectStatus = <JourneyResponse extends { status: number; body: unknown }>(
  response: JourneyResponse,
  expectedStatus: number,
  step: string,
): JourneyResponse => {
  if (response.status !== expectedStatus) {
    throw new Error(`${step} answered ${response.status}: ${JSON.stringify(response.body)}`);
  }
  return response;
};

export const startJourney = async ({
  paymentMethod,
  paymentStatus,
  lines,
  deliveryFee,
  coupon,
  partnerApiConnection = null,
}: {
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  lines: JourneyLine[];
  deliveryFee?: number;
  coupon?: { discountAmount: number; platformFundedAmount: number };
  partnerApiConnection?: PartnerApiConnection | null;
}) => {
  const { hub, zone } = await createCoveredPickupArea([CUSTOMER_CITY]);
  const partner = await createDeliveryPartnerCovering({
    hubId: hub.id,
    deliveryZoneIds: [zone.id],
    apiConnection: partnerApiConnection,
  });
  const { order, buyer, items } = await createRefundableOrder({
    paymentMethod,
    paymentStatus,
    lines: lines.map(({ unitPrice, qty, brandShips, platformDiscountAmount }) => ({
      unitPrice,
      qty,
      fulfilmentMode: brandShips ? FulfilmentMode.BRAND_SHIPS : FulfilmentMode.OUTFIQE_LOGISTICS,
      ...(platformDiscountAmount === undefined ? {} : { platformDiscountAmount }),
    })),
    ...(deliveryFee === undefined ? {} : { deliveryFee }),
    ...(coupon ? { coupon } : {}),
  });
  const staff = await createStaffForHub();
  const rider = await createRiderSession({ hubId: hub.id });

  const brands = [];
  for (const { item, group, size } of items) {
    const owner = await createOwnerSessionForBrand(group.brandId);
    const isHubFlow = group.fulfilmentMode === FulfilmentMode.OUTFIQE_LOGISTICS;
    const pickupLocation = isHubFlow
      ? await createDefaultPickupLocation(group.brandId, CUSTOMER_CITY)
      : null;
    if (pickupLocation) {
      await prisma.orderFulfilmentGroup.update({
        where: { id: group.id },
        data: { hubId: hub.id, pickupLocationId: pickupLocation.id },
      });
    }
    brands.push({
      groupId: group.id,
      itemId: item.id,
      sizeId: size.id,
      qty: item.qty,
      pickupCode: group.pickupCode,
      pickupLocationId: pickupLocation?.id ?? null,
      owner,
    });
  }

  return {
    order,
    buyer: { ...buyer, authHeader: authHeaderFor(buyer.id, UserRole.CUSTOMER) },
    hub,
    partner,
    staff,
    rider,
    brands,
  };
};

export type Journey = Awaited<ReturnType<typeof startJourney>>;
export type JourneyBrand = Journey["brands"][number];

export const markBagReady = async ({ owner, groupId }: JourneyBrand) =>
  expectStatus(
    await request(testApp)
      .post(`/api/logistics/brand/pickups/${groupId}/ready`)
      .set("Authorization", owner.authHeader),
    HTTP_STATUS.OK,
    "Ready for pickup",
  );

export const collectBagWithRider = async (journey: Journey, brand: JourneyBrand) => {
  const { staff, rider, hub } = journey;
  const assigned = expectStatus(
    await request(testApp)
      .post(ADMIN_TASKS_PATH)
      .set("Authorization", staff.authHeader)
      .send({
        riderId: rider.riderId,
        pickupLocationId: requireFixtureId(brand.pickupLocationId ?? undefined),
        fulfilmentGroupIds: [brand.groupId],
        roundStartsAt: new Date().toISOString(),
      }),
    HTTP_STATUS.CREATED,
    "Assign rider",
  );
  const taskId = requireFixtureId(assigned.body.data.id);
  const bagTag = await createBagTag(hub.id, staff.userId);
  expectStatus(
    await request(testApp)
      .post(`${RIDER_TASKS_PATH}/${taskId}/collect-scans`)
      .set("Authorization", rider.authHeader)
      .set(IDEMPOTENCY_HEADER, withKey("scan"))
      .send({
        pickupCode: requireFixtureId(brand.pickupCode ?? undefined),
        bagTagCode: bagTag.code,
        scannedAt: new Date().toISOString(),
      }),
    HTTP_STATUS.OK,
    "Rider scan",
  );
  return { taskId, bagTagCode: bagTag.code };
};

export const checkInAndInspectBag = async (
  { staff, hub }: Journey,
  brand: JourneyBrand,
  bagTagCode: string,
  failedQty: number = NO_FAILED_UNITS,
) => {
  expectStatus(
    await request(testApp)
      .post(`${HUB_PATH}/check-ins`)
      .set("Authorization", staff.authHeader)
      .set(IDEMPOTENCY_HEADER, withKey("hub"))
      .send({ hubId: hub.id, code: bagTagCode, countedUnits: brand.qty }),
    HTTP_STATUS.OK,
    "Hub check-in",
  );
  return expectStatus(
    await request(testApp)
      .post(`${HUB_PATH}/pickups/${brand.groupId}/inspection`)
      .set("Authorization", staff.authHeader)
      .send({ lines: [{ orderItemId: brand.itemId, failedQty }] }),
    HTTP_STATUS.OK,
    "Inspection",
  );
};

export const bringBagToHub = async (journey: Journey, brand: JourneyBrand) => {
  await markBagReady(brand);
  const { bagTagCode, taskId } = await collectBagWithRider(journey, brand);
  await checkInAndInspectBag(journey, brand, bagTagCode);
  return { bagTagCode, taskId };
};

export const packParcel = async (
  { staff, order }: Journey,
  { packsOnlyPickupsAtHub = false }: { packsOnlyPickupsAtHub?: boolean } = {},
) => {
  const packed = expectStatus(
    await request(testApp)
      .post(`${HUB_PATH}/orders/${order.id}/parcels`)
      .set("Authorization", staff.authHeader)
      .send({
        weightGrams: PARCEL_WEIGHT_GRAMS,
        parcelCount: SINGLE_PACKAGE,
        ...(packsOnlyPickupsAtHub ? { packsOnlyPickupsAtHub } : {}),
      }),
    HTTP_STATUS.CREATED,
    "Pack parcel",
  );
  return {
    shipmentId: requireFixtureId(packed.body.data.shipmentId),
    trackingCode: requireFixtureId(packed.body.data.trackingCode),
    codAmountToCollect: Number(packed.body.data.codAmountToCollect),
  };
};

export const bookByHandAndHandOver = async (
  { staff, hub }: Journey,
  { shipmentId, trackingCode }: { shipmentId: string; trackingCode: string },
  partnerReference: string,
) => {
  expectStatus(
    await request(testApp)
      .post(`${HUB_PATH}/shipments/${shipmentId}/booking`)
      .set("Authorization", staff.authHeader)
      .send({ partnerReference }),
    HTTP_STATUS.OK,
    "Manual booking",
  );
  await handOverParcel({ staff, hub }, { shipmentId, trackingCode });
};

export const handOverParcel = async (
  { staff, hub }: Pick<Journey, "staff" | "hub">,
  { shipmentId, trackingCode }: { shipmentId: string; trackingCode: string },
) => {
  expectStatus(
    await request(testApp)
      .post(`${HUB_PATH}/shipments/${shipmentId}/label-printed`)
      .set("Authorization", staff.authHeader),
    HTTP_STATUS.OK,
    "Label printed",
  );
  expectStatus(
    await request(testApp)
      .post(`${HUB_PATH}/handovers`)
      .set("Authorization", staff.authHeader)
      .set(IDEMPOTENCY_HEADER, withKey("handover"))
      .send({ hubId: hub.id, code: trackingCode }),
    HTTP_STATUS.OK,
    "Handover",
  );
};

export const importPartnerStatuses = async (
  { staff, partner }: Journey,
  rows: { partnerReference: string; status: string; codCollected?: number }[],
) =>
  expectStatus(
    await request(testApp)
      .post(`/api/logistics/admin/partners/${partner.id}/status-imports`)
      .set("Authorization", staff.authHeader)
      .send({
        fileName: "daily.csv",
        csv: [
          "Partner ID,Status,Time,COD collected",
          ...rows.map(
            ({ partnerReference, status, codCollected }) =>
              `${partnerReference},${status},${new Date().toISOString()},${codCollected ?? ""}`,
          ),
        ].join("\n"),
      }),
    HTTP_STATUS.CREATED,
    "Status import",
  );

export const readCustomerTracking = async ({ buyer, order }: Journey) =>
  expectStatus(
    await request(testApp)
      .get(`/api/logistics/orders/${order.id}/tracking`)
      .set("Authorization", buyer.authHeader),
    HTTP_STATUS.OK,
    "Customer tracking",
  );
