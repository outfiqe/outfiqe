import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { redis } from "#redis/redis.client.js";
import { createCoveredPickupArea } from "#test/integration/logistics-fixtures.js";
import { createBrandOwnerSession } from "#test/integration/product-fixtures.js";
import { testApp } from "#test/integration/test-app.js";

const PICKUP_LOCATIONS_PATH = "/api/logistics/brand/pickup-locations";
const MAX_PICKUP_LOCATIONS_PER_BRAND = 10;

const locationBody = (overrides: Record<string, unknown> = {}) => ({
  label: "Studio",
  contactName: "Studio Manager",
  contactPhone: "9812345678",
  address: "Jhamsikhel Road",
  city: "Lalitpur",
  ...overrides,
});

const addLocation = (authHeader: string, overrides: Record<string, unknown> = {}) =>
  request(testApp)
    .post(PICKUP_LOCATIONS_PATH)
    .set("Authorization", authHeader)
    .send(locationBody(overrides));

beforeEach(async () => {
  await redis.flushdb();
});

describe("brand pickup locations", () => {
  it("makes the first location the default and says when no hub covers it", async () => {
    const { authHeader } = await createBrandOwnerSession();

    const response = await addLocation(authHeader);

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      isDefault: true,
      contactPhone: "+9779812345678",
      countryCode: "NP",
      isCoveredByOutfiqePickup: false,
    });
  });

  it("says the location is covered once a hub collects from its city", async () => {
    const { authHeader } = await createBrandOwnerSession();
    await createCoveredPickupArea(["Lalitpur"]);

    const response = await addLocation(authHeader, { city: " lalitpur " });

    expect(response.body.data.isCoveredByOutfiqePickup).toBe(true);
  });

  it("keeps the first location as the default when another is added", async () => {
    const { authHeader } = await createBrandOwnerSession();
    await addLocation(authHeader);

    const second = await addLocation(authHeader, { label: "Warehouse" });
    const listed = await request(testApp)
      .get(PICKUP_LOCATIONS_PATH)
      .set("Authorization", authHeader);

    expect(second.body.data.isDefault).toBe(false);
    expect(
      listed.body.data.pickupLocations.map((location: { label: string }) => location.label),
    ).toEqual(["Studio", "Warehouse"]);
  });

  it("moves the default to another location", async () => {
    const { authHeader, brandId } = await createBrandOwnerSession();
    await addLocation(authHeader);
    const second = await addLocation(authHeader, { label: "Warehouse" });

    const response = await request(testApp)
      .post(`${PICKUP_LOCATIONS_PATH}/${second.body.data.id}/default`)
      .set("Authorization", authHeader);

    expect(response.status).toBe(200);
    const defaults = await prisma.brandPickupLocation.findMany({
      where: { brandId, isDefault: true },
    });
    expect(defaults.map((location) => location.id)).toEqual([second.body.data.id]);
  });

  it("promotes the oldest remaining location when the default is removed", async () => {
    const { authHeader } = await createBrandOwnerSession();
    const first = await addLocation(authHeader);
    const second = await addLocation(authHeader, { label: "Warehouse" });

    await request(testApp)
      .delete(`${PICKUP_LOCATIONS_PATH}/${first.body.data.id}`)
      .set("Authorization", authHeader);
    const listed = await request(testApp)
      .get(PICKUP_LOCATIONS_PATH)
      .set("Authorization", authHeader);

    expect(listed.body.data.pickupLocations).toEqual([
      expect.objectContaining({ id: second.body.data.id, isDefault: true }),
    ]);
  });

  it("updates a location's details", async () => {
    const { authHeader } = await createBrandOwnerSession();
    const created = await addLocation(authHeader);

    const response = await request(testApp)
      .put(`${PICKUP_LOCATIONS_PATH}/${created.body.data.id}`)
      .set("Authorization", authHeader)
      .send(locationBody({ address: "Sanepa Chowk", latitude: 27.68, longitude: 85.31 }));

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      address: "Sanepa Chowk",
      latitude: 27.68,
      longitude: 85.31,
    });
  });

  it("hides another brand's location", async () => {
    const owner = await createBrandOwnerSession();
    const otherOwner = await createBrandOwnerSession();
    const created = await addLocation(owner.authHeader);

    const response = await request(testApp)
      .put(`${PICKUP_LOCATIONS_PATH}/${created.body.data.id}`)
      .set("Authorization", otherOwner.authHeader)
      .send(locationBody());

    expect(response.status).toBe(404);
  });

  it("refuses an invalid contact phone number", async () => {
    const { authHeader } = await createBrandOwnerSession();

    const response = await addLocation(authHeader, { contactPhone: "12345" });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("INVALID_PHONE");
  });

  it("refuses a map pin with only one coordinate", async () => {
    const { authHeader } = await createBrandOwnerSession();

    const response = await addLocation(authHeader, { latitude: 27.68 });

    expect(response.status).toBe(400);
  });

  it("caps how many pickup locations a brand can have", async () => {
    const { authHeader, brandId } = await createBrandOwnerSession();
    await prisma.brandPickupLocation.createMany({
      data: Array.from({ length: MAX_PICKUP_LOCATIONS_PER_BRAND }, (_, index) => ({
        brandId,
        label: `Location ${index}`,
        contactName: "Manager",
        contactPhoneE164: "+9779812345678",
        address: "Road",
        city: "Lalitpur",
        cityNormalized: "lalitpur",
        countryCode: "NP",
      })),
    });

    const response = await addLocation(authHeader);

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("PICKUP_LOCATION_LIMIT_REACHED");
  });
});
