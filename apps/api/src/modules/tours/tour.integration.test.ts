import { randomUUID } from "node:crypto";

import { TourKey, TourOutcome } from "@outfiqe/types";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { redis } from "#redis/redis.client.js";
import { testApp } from "#test/integration/testApp.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

const BRAND_TOUR_PATH = `/api/tours/me/${TourKey.BRAND_DASHBOARD}`;

beforeEach(async () => {
  await redis.flushdb();
});

const createUser = async (role: UserRole = UserRole.BRAND_OWNER) =>
  prisma.user.create({
    data: {
      email: `${randomUUID()}@outfiqe.test`,
      name: "Tour Taker",
      handle: `tour-taker-${randomUUID().slice(0, 8)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role,
    },
  });

const authHeaderFor = (userId: string, role: UserRole = UserRole.BRAND_OWNER) => {
  const { accessToken } = generateTokenpair({ sub: userId, role });
  return `Bearer ${accessToken}`;
};

describe("GET /api/tours/me", () => {
  it("requires authentication", async () => {
    const response = await request(testApp).get("/api/tours/me");
    expect(response.status).toBe(401);
  });

  it("returns an empty list for a user who has never seen a tour", async () => {
    const user = await createUser();

    const response = await request(testApp)
      .get("/api/tours/me")
      .set("Authorization", authHeaderFor(user.id));

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ tours: [] });
  });

  it("leaves out rows for tour keys the API no longer knows", async () => {
    const user = await createUser();
    await prisma.userTourProgress.create({
      data: { userId: user.id, tourKey: "retired-tour", version: 1, outcome: "COMPLETED" },
    });

    const response = await request(testApp)
      .get("/api/tours/me")
      .set("Authorization", authHeaderFor(user.id));

    expect(response.body.data).toEqual({ tours: [] });
  });

  it("never shows one user another user's progress", async () => {
    const owner = await createUser();
    const stranger = await createUser();
    await request(testApp)
      .put(BRAND_TOUR_PATH)
      .set("Authorization", authHeaderFor(owner.id))
      .send({ version: 1, outcome: TourOutcome.COMPLETED });

    const response = await request(testApp)
      .get("/api/tours/me")
      .set("Authorization", authHeaderFor(stranger.id));

    expect(response.body.data).toEqual({ tours: [] });
  });
});

describe("PUT /api/tours/me/:tourKey", () => {
  it("requires authentication", async () => {
    const response = await request(testApp)
      .put(BRAND_TOUR_PATH)
      .send({ version: 1, outcome: TourOutcome.COMPLETED });
    expect(response.status).toBe(401);
  });

  it("saves the outcome and reads it back", async () => {
    const user = await createUser();
    const authHeader = authHeaderFor(user.id);

    const put = await request(testApp)
      .put(BRAND_TOUR_PATH)
      .set("Authorization", authHeader)
      .send({ version: 1, outcome: TourOutcome.DISMISSED });

    expect(put.status).toBe(200);
    expect(put.body.data).toMatchObject({
      tourKey: TourKey.BRAND_DASHBOARD,
      version: 1,
      outcome: TourOutcome.DISMISSED,
    });

    const get = await request(testApp).get("/api/tours/me").set("Authorization", authHeader);
    expect(get.body.data.tours).toEqual([
      expect.objectContaining({
        tourKey: TourKey.BRAND_DASHBOARD,
        version: 1,
        outcome: TourOutcome.DISMISSED,
      }),
    ]);
  });

  it("updates the single row on a repeat save instead of adding another", async () => {
    const user = await createUser();
    const authHeader = authHeaderFor(user.id);

    await request(testApp)
      .put(BRAND_TOUR_PATH)
      .set("Authorization", authHeader)
      .send({ version: 1, outcome: TourOutcome.DISMISSED });
    await request(testApp)
      .put(BRAND_TOUR_PATH)
      .set("Authorization", authHeader)
      .send({ version: 2, outcome: TourOutcome.COMPLETED });

    const savedRows = await prisma.userTourProgress.findMany({ where: { userId: user.id } });
    expect(savedRows).toHaveLength(1);
    expect(savedRows[0]).toMatchObject({ version: 2, outcome: TourOutcome.COMPLETED });
  });

  it("keeps one row when the same save arrives twice at once", async () => {
    const user = await createUser();
    const authHeader = authHeaderFor(user.id);
    const sendSave = () =>
      request(testApp)
        .put(BRAND_TOUR_PATH)
        .set("Authorization", authHeader)
        .send({ version: 1, outcome: TourOutcome.COMPLETED });

    const responses = await Promise.all([sendSave(), sendSave()]);

    expect(responses.some((response) => response.status === 200)).toBe(true);
    expect(await prisma.userTourProgress.count({ where: { userId: user.id } })).toBe(1);
  });

  it("rejects an unknown tour key", async () => {
    const user = await createUser();

    const response = await request(testApp)
      .put("/api/tours/me/not-a-tour")
      .set("Authorization", authHeaderFor(user.id))
      .send({ version: 1, outcome: TourOutcome.COMPLETED });

    expect(response.status).toBe(422);
  });

  it.each([
    { version: 0, outcome: TourOutcome.COMPLETED },
    { version: 1.5, outcome: TourOutcome.COMPLETED },
    { version: 1001, outcome: TourOutcome.COMPLETED },
    { version: 1, outcome: "SKIPPED" },
    { outcome: TourOutcome.COMPLETED },
  ])("rejects an invalid body %o", async (invalidBody) => {
    const user = await createUser();

    const response = await request(testApp)
      .put(BRAND_TOUR_PATH)
      .set("Authorization", authHeaderFor(user.id))
      .send(invalidBody);

    expect(response.status).toBe(422);
  });

  it("works for any signed-in role, not just brand owners", async () => {
    const shopper = await createUser(UserRole.CUSTOMER);

    const response = await request(testApp)
      .put(BRAND_TOUR_PATH)
      .set("Authorization", authHeaderFor(shopper.id, UserRole.CUSTOMER))
      .send({ version: 1, outcome: TourOutcome.COMPLETED });

    expect(response.status).toBe(200);
  });
});
