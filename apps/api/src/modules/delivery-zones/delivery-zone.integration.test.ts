import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { redis } from "#redis/redis.client.js";
import { createAdminSessionWithPlatformPermissions } from "#test/integration/auth-helpers.js";
import { createDefaultDeliveryZone } from "#test/integration/order-fixtures.js";
import { testApp } from "#test/integration/test-app.js";

const zoneBody = {
  name: "Kathmandu Valley",
  cities: ["Kathmandu", "Lalitpur"],
  standardDeliveryFee: 100,
  freeDeliveryThreshold: 5000,
  codHandlingFee: 0,
};

beforeEach(async () => {
  await redis.flushdb();
});

describe("delivery zone delivery days and estimates", () => {
  it("stores delivery days and the country on a new zone", async () => {
    const { authHeader } =
      await createAdminSessionWithPlatformPermissions("platform:orders:manage");

    const response = await request(testApp)
      .post("/api/delivery-zones")
      .set("Authorization", authHeader)
      .send({ ...zoneBody, minDeliveryDays: 1, maxDeliveryDays: 2 });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      countryCode: "NP",
      minDeliveryDays: 1,
      maxDeliveryDays: 2,
    });
  });

  it("estimates a delivery window for a city in a zone with delivery days", async () => {
    const { authHeader } =
      await createAdminSessionWithPlatformPermissions("platform:orders:manage");
    await request(testApp)
      .post("/api/delivery-zones")
      .set("Authorization", authHeader)
      .send({ ...zoneBody, minDeliveryDays: 1, maxDeliveryDays: 2 });

    const response = await request(testApp)
      .get("/api/delivery-zones/estimate")
      .query({ city: "lalitpur" });

    expect(response.status).toBe(200);
    expect(response.body.data.estimate).toEqual({
      earliestDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      latestDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    });
    expect(response.body.data.estimate.latestDate >= response.body.data.estimate.earliestDate).toBe(
      true,
    );
  });

  it("has no estimate when the matching zone has no delivery days", async () => {
    await createDefaultDeliveryZone();

    const response = await request(testApp)
      .get("/api/delivery-zones/estimate")
      .query({ city: "Somewhere Far" });

    expect(response.status).toBe(200);
    expect(response.body.data.estimate).toBeNull();
  });

  it("still refuses the same city in two zones of one country", async () => {
    const { authHeader } =
      await createAdminSessionWithPlatformPermissions("platform:orders:manage");
    await request(testApp)
      .post("/api/delivery-zones")
      .set("Authorization", authHeader)
      .send(zoneBody);

    const response = await request(testApp)
      .post("/api/delivery-zones")
      .set("Authorization", authHeader)
      .send({ ...zoneBody, name: "Duplicate" });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("CITY_ALREADY_ASSIGNED");
  });
});
