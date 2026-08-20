import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { CreatorStatus, UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { testApp } from "#test/integration/testApp.js";

const uniquePhone = () => `98${randomUUID().replace(/\D/g, "1").slice(0, 8)}`;

const createApprovedCreator = async (
  name: string,
  handle: string,
  overrides: { heightCm?: number; showHeight?: boolean } = {},
) =>
  prisma.user.create({
    data: {
      email: `${handle}-${randomUUID()}@outfiqe.test`,
      name,
      handle: `${handle}-${randomUUID().slice(0, 6)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      isCreator: true,
      creatorStatus: CreatorStatus.APPROVED,
      ...overrides,
    },
  });

const authHeaderFor = (userId: string) => {
  const { accessToken } = generateTokenpair({ sub: userId, role: UserRole.CUSTOMER });
  return `Bearer ${accessToken}`;
};

describe("GET /api/creators/autocomplete", () => {
  it("returns approved creators ranked by name/handle match", async () => {
    await createApprovedCreator("Ava Martinez", "ava-martinez");
    await createApprovedCreator("Noah Chen", "noah-chen");

    const response = await request(testApp)
      .get("/api/creators/autocomplete")
      .query({ q: "Ava Martinez" });

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeGreaterThan(0);
    expect(response.body.data[0]).toMatchObject({ name: "Ava Martinez" });
    expect(response.body.data[0]).toHaveProperty("userId");
    expect(response.body.data[0]).toHaveProperty("handle");
    expect(response.body.data[0]).toHaveProperty("followerCount");
  });

  it("excludes users who aren't approved creators", async () => {
    await prisma.user.create({
      data: {
        email: `pending-${randomUUID()}@outfiqe.test`,
        name: "Pending Creator",
        handle: `pending-creator-${randomUUID().slice(0, 6)}`,
        phone: uniquePhone(),
        passwordHash: "not-used-in-tests",
        isCreator: false,
        creatorStatus: CreatorStatus.PENDING,
      },
    });

    const response = await request(testApp)
      .get("/api/creators/autocomplete")
      .query({ q: "Pending Creator" });

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(0);
  });

  it("returns an empty list for no match instead of erroring", async () => {
    const response = await request(testApp)
      .get("/api/creators/autocomplete")
      .query({ q: "zzznonexistentcreatorzzz" });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
  });

  it("rejects an empty query", async () => {
    const response = await request(testApp).get("/api/creators/autocomplete").query({ q: "" });

    expect(response.status).toBe(422);
  });
});

describe("PATCH /api/creators/me", () => {
  it("updates the creator's height and show-height preference", async () => {
    const creator = await createApprovedCreator("Height Setter", "height-setter");

    const response = await request(testApp)
      .patch("/api/creators/me")
      .set("Authorization", authHeaderFor(creator.id))
      .send({ heightCm: 178, showHeight: true });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ heightCm: 178, showHeight: true });

    const stored = await prisma.user.findUniqueOrThrow({ where: { id: creator.id } });
    expect(stored.heightCm).toBe(178);
    expect(stored.showHeight).toBe(true);
  });

  it("rejects a height outside the allowed range", async () => {
    const creator = await createApprovedCreator("Height Rejector", "height-rejector");

    const response = await request(testApp)
      .patch("/api/creators/me")
      .set("Authorization", authHeaderFor(creator.id))
      .send({ heightCm: 400 });

    expect(response.status).toBe(422);
  });

  it("requires authentication", async () => {
    const response = await request(testApp)
      .patch("/api/creators/me")
      .send({ heightCm: 178, showHeight: true });

    expect(response.status).toBe(401);
  });
});

describe("GET /api/creators/by-handle/:handle", () => {
  it("hides height from other viewers when the creator has not opted in", async () => {
    const creator = await createApprovedCreator("Hidden Height", "hidden-height", {
      heightCm: 165,
      showHeight: false,
    });
    const viewer = await createApprovedCreator("Some Viewer", "some-viewer");

    const response = await request(testApp)
      .get(`/api/creators/by-handle/${creator.handle}`)
      .set("Authorization", authHeaderFor(viewer.id));

    expect(response.status).toBe(200);
    expect(response.body.data.heightCm).toBeNull();
    expect(response.body.data.showHeight).toBe(false);
  });

  it("shows height to other viewers when the creator has opted in", async () => {
    const creator = await createApprovedCreator("Shown Height", "shown-height", {
      heightCm: 172,
      showHeight: true,
    });

    const response = await request(testApp).get(`/api/creators/by-handle/${creator.handle}`);

    expect(response.status).toBe(200);
    expect(response.body.data.heightCm).toBe(172);
  });

  it("always reveals the real height to the profile owner, even when hidden from others", async () => {
    const creator = await createApprovedCreator("Owner View", "owner-view", {
      heightCm: 190,
      showHeight: false,
    });

    const response = await request(testApp)
      .get(`/api/creators/by-handle/${creator.handle}`)
      .set("Authorization", authHeaderFor(creator.id));

    expect(response.status).toBe(200);
    expect(response.body.data.heightCm).toBe(190);
  });
});
