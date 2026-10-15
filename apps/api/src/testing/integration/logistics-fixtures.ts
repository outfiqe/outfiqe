import { randomUUID } from "node:crypto";

import { PICKUP_CODE_LENGTH } from "@outfiqe/utils";

import { prisma } from "#db/prisma.js";
import {
  FulfilmentMode,
  FulfilmentStatus,
  PickupStatus,
  ShipmentStatus,
} from "#generated/prisma/enums.js";
import { generateRandomCode } from "#lib/random-code.utils.js";

import { createBuyer, createOrder, createPurchasableProduct } from "./order-fixtures.js";

const KATHMANDU_TIME_ZONE = "Asia/Kathmandu";
const SUNDAY_TO_FRIDAY = [0, 1, 2, 3, 4, 5];
const DEFAULT_PARCEL_WEIGHT_GRAMS = 1200;
const SINGLE_PACKAGE = 1;
const NOTHING_TO_COLLECT = 0;
const DEFAULT_PRODUCT_PRICE = 1000;
const ONE_BRAND = 1;
const NO_BRANDS = 0;
const READY_CUTOFF_MINUTES = 60;

export const createHub = () =>
  prisma.hub.create({
    data: {
      name: `Test Hub ${randomUUID().slice(0, 6)}`,
      countryCode: "NP",
      address: "Teku, Kathmandu",
      city: "Kathmandu",
      phoneE164: "+9779800000001",
      timeZone: KATHMANDU_TIME_ZONE,
      workingDays: SUNDAY_TO_FRIDAY,
      openTime: "09:00",
      closeTime: "19:00",
      pickupRoundTimes: ["11:00", "15:00"],
      readyCutoffMinutes: READY_CUTOFF_MINUTES,
      partnerCollectionTime: "17:30",
    },
  });

type HubOrderOptions = {
  hubBrandCount?: number;
  brandShippedBrandCount?: number;
};

export const createHubOrder = async ({
  hubBrandCount = ONE_BRAND,
  brandShippedBrandCount = NO_BRANDS,
}: HubOrderOptions = {}) => {
  const buyer = await createBuyer();
  const hub = await createHub();
  const order = await createOrder(buyer.id);

  const hubGroupIds = await Promise.all(
    Array.from({ length: hubBrandCount }, async () => {
      const { brand } = await createPurchasableProduct(DEFAULT_PRODUCT_PRICE);
      const group = await prisma.orderFulfilmentGroup.create({
        data: {
          orderId: order.id,
          brandId: brand.id,
          fulfilmentMode: FulfilmentMode.OUTFIQE_LOGISTICS,
          pickupStatus: PickupStatus.AWAITING_BRAND,
          pickupCode: generateRandomCode(PICKUP_CODE_LENGTH),
          hubId: hub.id,
        },
      });
      return group.id;
    }),
  );

  const brandShippedGroupIds = await Promise.all(
    Array.from({ length: brandShippedBrandCount }, async () => {
      const { brand } = await createPurchasableProduct(DEFAULT_PRODUCT_PRICE);
      const group = await prisma.orderFulfilmentGroup.create({
        data: { orderId: order.id, brandId: brand.id },
      });
      return group.id;
    }),
  );

  return { buyer, hub, order, hubGroupIds, brandShippedGroupIds };
};

export const packGroupsIntoParcel = async (
  orderId: string,
  hubId: string,
  fulfilmentGroupIds: string[],
) => {
  const shipment = await prisma.shipment.create({
    data: {
      orderId,
      hubId,
      trackingCode: `OFQ-${generateRandomCode(PICKUP_CODE_LENGTH)}`,
      status: ShipmentStatus.PACKED,
      currency: "NPR",
      codAmountToCollect: NOTHING_TO_COLLECT,
      weightGrams: DEFAULT_PARCEL_WEIGHT_GRAMS,
      parcelCount: SINGLE_PACKAGE,
    },
  });
  await prisma.orderFulfilmentGroup.updateMany({
    where: { id: { in: fulfilmentGroupIds } },
    data: {
      pickupStatus: PickupStatus.IN_PARCEL,
      shipmentId: shipment.id,
      status: FulfilmentStatus.PACKED,
    },
  });
  return shipment;
};

export const requireFixtureId = (id: string | undefined): string => {
  if (!id) throw new Error("The fixture did not create the record this test expects.");
  return id;
};
