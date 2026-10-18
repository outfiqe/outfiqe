import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import {
  FulfilmentMode,
  FulfilmentStatus,
  PickupStatus,
  TrackingEventCode,
} from "#generated/prisma/enums.js";
import { redis } from "#redis/redis.client.js";
import { createPickupForBrand } from "#test/integration/logistics-fixtures.js";
import { createBrandOwnerSession } from "#test/integration/product-fixtures.js";
import { testApp } from "#test/integration/test-app.js";

const ONE_EVENT = 1;

const readyPath = (fulfilmentGroupId: string) =>
  `/api/logistics/brand/pickups/${fulfilmentGroupId}/ready`;

const brandDetailPath = (fulfilmentGroupId: string) =>
  `/api/orders/brand/fulfilment-groups/${fulfilmentGroupId}`;

beforeEach(async () => {
  await redis.flushdb();
});

describe("brand marks a hub pickup ready", () => {
  it("moves the pickup to ready, records the event and rolls the order up", async () => {
    const { authHeader, brandId } = await createBrandOwnerSession();
    const { group, order } = await createPickupForBrand(brandId);

    const response = await request(testApp)
      .post(readyPath(group.id))
      .set("Authorization", authHeader);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      fulfilmentGroupId: group.id,
      pickupStatus: PickupStatus.READY_FOR_PICKUP,
      pickupCode: group.pickupCode,
    });
    expect(
      await prisma.trackingEvent.count({
        where: { fulfilmentGroupId: group.id, code: TrackingEventCode.READY_FOR_PICKUP },
      }),
    ).toBe(ONE_EVENT);
    const rolledUpOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(rolledUpOrder.fulfilmentStatus).toBe(FulfilmentStatus.PACKED);
  });

  it("answers a repeated press without recording it twice", async () => {
    const { authHeader, brandId } = await createBrandOwnerSession();
    const { group } = await createPickupForBrand(brandId);

    await request(testApp).post(readyPath(group.id)).set("Authorization", authHeader);
    const repeated = await request(testApp)
      .post(readyPath(group.id))
      .set("Authorization", authHeader);

    expect(repeated.status).toBe(200);
    expect(await prisma.trackingEvent.count({ where: { fulfilmentGroupId: group.id } })).toBe(
      ONE_EVENT,
    );
  });

  it("refuses once the rider has collected the items", async () => {
    const { authHeader, brandId } = await createBrandOwnerSession();
    const { group } = await createPickupForBrand(brandId);
    await prisma.orderFulfilmentGroup.update({
      where: { id: group.id },
      data: { pickupStatus: PickupStatus.PICKED_UP },
    });

    const response = await request(testApp)
      .post(readyPath(group.id))
      .set("Authorization", authHeader);

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("PICKUP_ALREADY_MOVED_ON");
  });

  it("hides a group the brand ships itself", async () => {
    const { authHeader, brandId } = await createBrandOwnerSession();
    const { group } = await createPickupForBrand(brandId, FulfilmentMode.BRAND_SHIPS);

    const response = await request(testApp)
      .post(readyPath(group.id))
      .set("Authorization", authHeader);

    expect(response.status).toBe(404);
  });

  it("hides another brand's pickup", async () => {
    const owner = await createBrandOwnerSession();
    const otherOwner = await createBrandOwnerSession();
    const { group } = await createPickupForBrand(owner.brandId);

    const response = await request(testApp)
      .post(readyPath(group.id))
      .set("Authorization", otherOwner.authHeader);

    expect(response.status).toBe(404);
  });
});

describe("brand order views for hub-delivered orders", () => {
  it("shows the pickup code but not the customer's contact details", async () => {
    const { authHeader, brandId } = await createBrandOwnerSession();
    const { group } = await createPickupForBrand(brandId);

    const response = await request(testApp)
      .get(brandDetailPath(group.id))
      .set("Authorization", authHeader);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      fulfilmentMode: FulfilmentMode.OUTFIQE_LOGISTICS,
      pickupStatus: PickupStatus.AWAITING_BRAND,
      pickupCode: group.pickupCode,
      shipTo: null,
    });
  });

  it("still shows the customer's contact details when the brand ships itself", async () => {
    const { authHeader, brandId } = await createBrandOwnerSession();
    const { group } = await createPickupForBrand(brandId, FulfilmentMode.BRAND_SHIPS);

    const response = await request(testApp)
      .get(brandDetailPath(group.id))
      .set("Authorization", authHeader);

    expect(response.body.data.shipTo).toMatchObject({ fullName: "Test Buyer" });
  });

  it("refuses a brand's own status change on a hub-delivered order", async () => {
    const { authHeader, brandId } = await createBrandOwnerSession();
    const { group } = await createPickupForBrand(brandId);

    const response = await request(testApp)
      .patch(brandDetailPath(group.id))
      .set("Authorization", authHeader)
      .send({ status: FulfilmentStatus.PACKED });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("DELIVERED_BY_OUTFIQE");
  });
});
