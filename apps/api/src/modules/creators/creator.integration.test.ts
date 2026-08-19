import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { CreatorStatus } from "#generated/prisma/enums.js";
import { testApp } from "#test/integration/testApp.js";

const uniquePhone = () => `98${randomUUID().replace(/\D/g, "1").slice(0, 8)}`;

const createApprovedCreator = async (name: string, handle: string) =>
  prisma.user.create({
    data: {
      email: `${handle}-${randomUUID()}@outfiqe.test`,
      name,
      handle: `${handle}-${randomUUID().slice(0, 6)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      isCreator: true,
      creatorStatus: CreatorStatus.APPROVED,
    },
  });

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
