import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { CreatorStatus } from "#generated/prisma/enums.js";
import { testApp } from "#test/integration/testApp.js";

const uniquePhone = () => `98${randomUUID().replace(/\D/g, "1").slice(0, 8)}`;

const createCreator = async (name: string, handle: string) =>
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

const createLook = async (creatorId: string, caption: string) =>
  prisma.creatorLook.create({
    data: {
      creatorId,
      imageUrl: `https://cdn.outfiqe.test/${randomUUID()}.jpg`,
      caption,
    },
  });

describe("GET /api/creator-looks/autocomplete", () => {
  it("returns posts matching the caption, hydrated with creator info", async () => {
    const creator = await createCreator("Priya Shah", "priya-shah");
    await createLook(creator.id, "Winter layers done right");

    const response = await request(testApp)
      .get("/api/creator-looks/autocomplete")
      .query({ q: "winter layers" });

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeGreaterThan(0);
    expect(response.body.data[0]).toMatchObject({
      caption: "Winter layers done right",
      creator: { name: "Priya Shah" },
    });
    expect(response.body.data[0]).toHaveProperty("id");
    expect(response.body.data[0]).toHaveProperty("imageUrl");
    expect(response.body.data[0].creator).toHaveProperty("handle");
  });

  it("matches by the post's creator name, not just the caption", async () => {
    const creator = await createCreator("Sabin Shrestha", "sabin-shrestha");
    await createLook(creator.id, "Everyday street style");

    const response = await request(testApp)
      .get("/api/creator-looks/autocomplete")
      .query({ q: "Sabin Shrestha" });

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeGreaterThan(0);
    expect(response.body.data[0].creator).toMatchObject({ name: "Sabin Shrestha" });
  });

  it("works for an anonymous caller and never leaks viewer-only fields", async () => {
    const creator = await createCreator("Jordan Lee", "jordan-lee");
    await createLook(creator.id, "Studio session look");

    const response = await request(testApp)
      .get("/api/creator-looks/autocomplete")
      .query({ q: "Studio session" });

    expect(response.status).toBe(200);
    expect(response.body.data[0]).not.toHaveProperty("isLiked");
    expect(response.body.data[0]).not.toHaveProperty("isSaved");
    expect(response.body.data[0]).not.toHaveProperty("isFollowingCreator");
  });

  it("returns an empty list for no match instead of erroring", async () => {
    const response = await request(testApp)
      .get("/api/creator-looks/autocomplete")
      .query({ q: "zzznonexistentcaptionzzz" });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
  });

  it("rejects an empty query", async () => {
    const response = await request(testApp).get("/api/creator-looks/autocomplete").query({ q: "" });

    expect(response.status).toBe(422);
  });
});
