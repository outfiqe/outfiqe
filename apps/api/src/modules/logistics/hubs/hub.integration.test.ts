import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { redis } from "#redis/redis.client.js";
import { createAdminSessionWithPlatformPermissions } from "#test/integration/auth-helpers.js";
import { testApp } from "#test/integration/test-app.js";

const HUBS_PATH = "/api/logistics/admin/hubs";
const ONE_ZONE = 1;

const hubBody = {
  name: "Kathmandu Hub",
  countryCode: "NP",
  address: "Teku Road",
  city: "Kathmandu",
  phone: "9812345678",
  timeZone: "Asia/Kathmandu",
  workingDays: [0, 1, 2, 3, 4, 5],
  openTime: "09:00",
  closeTime: "19:00",
  pickupRoundTimes: ["11:00", "15:00"],
  readyCutoffMinutes: 60,
  partnerCollectionTime: "17:30",
};

const createZone = (name: string) =>
  prisma.deliveryZone.create({
    data: { name, standardDeliveryFee: 100, freeDeliveryThreshold: 5000, codHandlingFee: 0 },
  });

beforeEach(async () => {
  await redis.flushdb();
});

describe("logistics hub admin endpoints", () => {
  it("creates a hub with an international phone number and lists it", async () => {
    const { authHeader } = await createAdminSessionWithPlatformPermissions(
      "platform:logistics:manage",
    );

    const created = await request(testApp)
      .post(HUBS_PATH)
      .set("Authorization", authHeader)
      .send(hubBody);
    const listed = await request(testApp).get(HUBS_PATH).set("Authorization", authHeader);

    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ phone: "+9779812345678", isActive: true });
    expect(listed.body.data.hubs).toHaveLength(1);
  });

  it("refuses a phone number that isn't valid for the hub's country", async () => {
    const { authHeader } = await createAdminSessionWithPlatformPermissions(
      "platform:logistics:manage",
    );

    const response = await request(testApp)
      .post(HUBS_PATH)
      .set("Authorization", authHeader)
      .send({ ...hubBody, phone: "12345" });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("INVALID_PHONE");
  });

  it("sets the areas a hub collects from, replacing the previous list", async () => {
    const { authHeader } = await createAdminSessionWithPlatformPermissions(
      "platform:logistics:manage",
    );
    const { body } = await request(testApp)
      .post(HUBS_PATH)
      .set("Authorization", authHeader)
      .send(hubBody);
    const valleyZone = await createZone("Valley");
    const pokharaZone = await createZone("Pokhara");

    await request(testApp)
      .put(`${HUBS_PATH}/${body.data.id}/pickup-zones`)
      .set("Authorization", authHeader)
      .send({ deliveryZoneIds: [valleyZone.id, pokharaZone.id] });
    const response = await request(testApp)
      .put(`${HUBS_PATH}/${body.data.id}/pickup-zones`)
      .set("Authorization", authHeader)
      .send({ deliveryZoneIds: [valleyZone.id] });

    expect(response.status).toBe(200);
    expect(response.body.data.pickupZones).toEqual([{ id: valleyZone.id, name: "Valley" }]);
    expect(await prisma.hubPickupZone.count({ where: { hubId: body.data.id } })).toBe(ONE_ZONE);
  });

  it("refuses a pickup area that doesn't exist", async () => {
    const { authHeader } = await createAdminSessionWithPlatformPermissions(
      "platform:logistics:manage",
    );
    const { body } = await request(testApp)
      .post(HUBS_PATH)
      .set("Authorization", authHeader)
      .send(hubBody);

    const response = await request(testApp)
      .put(`${HUBS_PATH}/${body.data.id}/pickup-zones`)
      .set("Authorization", authHeader)
      .send({ deliveryZoneIds: ["00000000-0000-4000-8000-000000000009"] });

    expect(response.status).toBe(422);
    expect(response.body.code).toBe("PICKUP_ZONE_NOT_IN_HUB_COUNTRY");
  });

  it("updates a hub's schedule", async () => {
    const { authHeader } = await createAdminSessionWithPlatformPermissions(
      "platform:logistics:manage",
    );
    const { body } = await request(testApp)
      .post(HUBS_PATH)
      .set("Authorization", authHeader)
      .send(hubBody);

    const response = await request(testApp)
      .put(`${HUBS_PATH}/${body.data.id}`)
      .set("Authorization", authHeader)
      .send({ ...hubBody, pickupRoundTimes: ["10:30"], isActive: false });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ pickupRoundTimes: ["10:30"], isActive: false });
  });

  it("returns 404 for a hub that doesn't exist", async () => {
    const { authHeader } = await createAdminSessionWithPlatformPermissions(
      "platform:logistics:manage",
    );

    const response = await request(testApp)
      .put(`${HUBS_PATH}/00000000-0000-4000-8000-000000000009`)
      .set("Authorization", authHeader)
      .send(hubBody);

    expect(response.status).toBe(404);
  });
});
