import { isCrockfordCode, PICKUP_CODE_LENGTH } from "@outfiqe/utils";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { FulfilmentMode, PaymentMethod, PickupStatus, UserRole } from "#generated/prisma/enums.js";
import { redis } from "#redis/redis.client.js";
import { createAdminSession } from "#test/integration/auth-helpers.js";
import {
  createCoveredPickupArea,
  createDefaultPickupLocation,
  createDeliveryPartnerCovering,
  enableOrderLogisticsForBrands,
} from "#test/integration/logistics-fixtures.js";
import {
  authHeaderFor,
  createActiveCommissionRule,
  createBuyer,
  createDefaultDeliveryZone,
  createPurchasableProduct,
} from "#test/integration/order-fixtures.js";
import { testApp } from "#test/integration/test-app.js";

const PRODUCT_PRICE = 1000;
const COVERED_CITY = "Lalitpur";

beforeEach(async () => {
  await redis.flushdb();
  await enableOrderLogisticsForBrands([]);
});

const checkOut = async (productId: string, sizeId: string, city: string) => {
  const buyer = await createBuyer();
  const response = await request(testApp)
    .post("/api/orders/checkout")
    .set("Authorization", authHeaderFor(buyer.id, UserRole.CUSTOMER))
    .send({
      fullName: "Test Buyer",
      phone: "9812345678",
      address: "Pulchowk Road",
      city,
      paymentMethod: PaymentMethod.COD,
      buyNow: { productId, sizeId, qty: 1 },
    });
  expect(response.status).toBe(201);
  return prisma.order.findUniqueOrThrow({
    where: { id: response.body.data.id },
    include: { fulfilmentGroups: true },
  });
};

const prepareCheckout = async () => {
  const { userId: adminId } = await createAdminSession();
  await createActiveCommissionRule(adminId);
  await createDefaultDeliveryZone();
  return createPurchasableProduct(PRODUCT_PRICE);
};

describe("checkout fulfilment plan", () => {
  it("records country, currency and the international phone on every order", async () => {
    const { product, size } = await prepareCheckout();

    const order = await checkOut(product.id, size.id, "Kathmandu");

    expect(order).toMatchObject({
      countryCode: "NP",
      currency: "NPR",
      phoneE164: "+9779812345678",
      promisedDeliveryFrom: null,
      promisedDeliveryBy: null,
    });
  });

  it("keeps brands shipping their own orders while the feature flag is off", async () => {
    const { brand, product, size } = await prepareCheckout();
    await createCoveredPickupArea([COVERED_CITY]);
    await createDefaultPickupLocation(brand.id, COVERED_CITY);

    const order = await checkOut(product.id, size.id, COVERED_CITY);

    expect(order.fulfilmentGroups).toEqual([
      expect.objectContaining({
        fulfilmentMode: FulfilmentMode.BRAND_SHIPS,
        pickupStatus: null,
        pickupCode: null,
        hubId: null,
      }),
    ]);
  });

  it("sends a flagged brand with a covered pickup location through the hub", async () => {
    const { brand, product, size } = await prepareCheckout();
    const { hub, zone } = await createCoveredPickupArea([COVERED_CITY]);
    await createDeliveryPartnerCovering({ hubId: hub.id, deliveryZoneIds: [zone.id] });
    const pickupLocation = await createDefaultPickupLocation(brand.id, COVERED_CITY);
    await enableOrderLogisticsForBrands([brand.id]);

    const order = await checkOut(product.id, size.id, COVERED_CITY);

    const [group] = order.fulfilmentGroups;
    expect(group).toMatchObject({
      fulfilmentMode: FulfilmentMode.OUTFIQE_LOGISTICS,
      pickupStatus: PickupStatus.AWAITING_BRAND,
      hubId: hub.id,
      pickupLocationId: pickupLocation.id,
    });
    expect(isCrockfordCode(group?.pickupCode ?? "", PICKUP_CODE_LENGTH)).toBe(true);
  });

  it("keeps a flagged brand shipping its own orders when no delivery partner covers the customer", async () => {
    const { brand, product, size } = await prepareCheckout();
    await createCoveredPickupArea([COVERED_CITY]);
    await createDefaultPickupLocation(brand.id, COVERED_CITY);
    await enableOrderLogisticsForBrands([brand.id]);

    const order = await checkOut(product.id, size.id, COVERED_CITY);

    expect(order.fulfilmentGroups).toEqual([
      expect.objectContaining({ fulfilmentMode: FulfilmentMode.BRAND_SHIPS, hubId: null }),
    ]);
  });

  it("needs a partner that collects cash for a cash-on-delivery order", async () => {
    const { brand, product, size } = await prepareCheckout();
    const { hub, zone } = await createCoveredPickupArea([COVERED_CITY]);
    await createDeliveryPartnerCovering({
      hubId: hub.id,
      deliveryZoneIds: [zone.id],
      supportsCod: false,
    });
    await createDefaultPickupLocation(brand.id, COVERED_CITY);
    await enableOrderLogisticsForBrands([brand.id]);

    const order = await checkOut(product.id, size.id, COVERED_CITY);

    expect(order.fulfilmentGroups).toEqual([
      expect.objectContaining({ fulfilmentMode: FulfilmentMode.BRAND_SHIPS }),
    ]);
  });

  it("snapshots the delivery promise from the delivery city's zone", async () => {
    const { product, size } = await prepareCheckout();
    await createCoveredPickupArea([COVERED_CITY]);

    const order = await checkOut(product.id, size.id, COVERED_CITY);

    expect(order.promisedDeliveryFrom).not.toBeNull();
    expect(order.promisedDeliveryBy).not.toBeNull();
    expect(order.promisedDeliveryBy?.getTime()).toBeGreaterThanOrEqual(
      order.promisedDeliveryFrom?.getTime() ?? Number.POSITIVE_INFINITY,
    );
  });
});
