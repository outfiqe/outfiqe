import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { CreatorStatus } from "#generated/prisma/enums.js";
import { CONTENT_MODERATE_PERMISSION_KEY } from "#modules/platform-access/platform-access.constants.js";
import {
  createAdminSession,
  createAdminSessionWithPlatformPermissions,
} from "#test/integration/authHelpers.js";
import { testApp } from "#test/integration/testApp.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

const createCreator = (name = "Creator", handle?: string) =>
  prisma.user.create({
    data: {
      email: `${randomUUID()}@creator.outfiqe.test`,
      name,
      handle: handle ?? `cr-${randomUUID().slice(0, 8)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      isCreator: true,
      creatorStatus: CreatorStatus.APPROVED,
    },
  });

const createLook = (creatorId: string, caption = "A look") =>
  prisma.creatorLook.create({
    data: { creatorId, imageUrl: `https://cdn.outfiqe.test/${randomUUID()}.jpg`, caption },
  });

describe("GET /api/creator-looks/admin", () => {
  it("401s without authentication", async () => {
    const response = await request(testApp).get("/api/creator-looks/admin");
    expect(response.status).toBe(401);
  });

  it("403s a coarse admin without the content-moderate permission", async () => {
    const { authHeader } = await createAdminSession();

    const response = await request(testApp)
      .get("/api/creator-looks/admin")
      .set("Authorization", authHeader);

    expect(response.status).toBe(403);
  });

  it("lists live posts newest-first for a moderator, hiding removed posts", async () => {
    const { authHeader } = await createAdminSessionWithPlatformPermissions(
      CONTENT_MODERATE_PERMISSION_KEY,
    );
    const creator = await createCreator();
    const older = await createLook(creator.id, "Older look");
    const newer = await createLook(creator.id, "Newer look");
    const removed = await createLook(creator.id, "Removed look");
    await prisma.creatorLook.update({ where: { id: removed.id }, data: { deletedAt: new Date() } });

    const response = await request(testApp)
      .get("/api/creator-looks/admin")
      .set("Authorization", authHeader);

    expect(response.status).toBe(200);
    const ids = response.body.data.items.map((item: { id: string }) => item.id);
    expect(ids).toEqual([newer.id, older.id]);
    expect(ids).not.toContain(removed.id);
    expect(response.body.data.items[0]).toMatchObject({
      caption: "Newer look",
      creator: { id: creator.id, handle: creator.handle },
    });
  });

  it("filters by caption text, case-insensitively", async () => {
    const { authHeader } = await createAdminSessionWithPlatformPermissions(
      CONTENT_MODERATE_PERMISSION_KEY,
    );
    const creator = await createCreator();
    const match = await createLook(creator.id, "Denim jacket fit");
    await createLook(creator.id, "Summer dress");

    const response = await request(testApp)
      .get("/api/creator-looks/admin")
      .query({ q: "denim" })
      .set("Authorization", authHeader);

    expect(response.status).toBe(200);
    const ids = response.body.data.items.map((item: { id: string }) => item.id);
    expect(ids).toEqual([match.id]);
  });

  it("filters by creator handle", async () => {
    const { authHeader } = await createAdminSessionWithPlatformPermissions(
      CONTENT_MODERATE_PERMISSION_KEY,
    );
    const targetCreator = await createCreator("Target Creator", "target-handle");
    const otherCreator = await createCreator();
    const match = await createLook(targetCreator.id, "A post");
    await createLook(otherCreator.id, "Another post");

    const response = await request(testApp)
      .get("/api/creator-looks/admin")
      .query({ q: "target-handle" })
      .set("Authorization", authHeader);

    expect(response.status).toBe(200);
    const ids = response.body.data.items.map((item: { id: string }) => item.id);
    expect(ids).toEqual([match.id]);
  });

  it("paginates via cursor", async () => {
    const { authHeader } = await createAdminSessionWithPlatformPermissions(
      CONTENT_MODERATE_PERMISSION_KEY,
    );
    const creator = await createCreator();
    const firstLook = await createLook(creator.id, "First");
    const secondLook = await createLook(creator.id, "Second");

    const firstPage = await request(testApp)
      .get("/api/creator-looks/admin")
      .query({ limit: 1 })
      .set("Authorization", authHeader);

    expect(firstPage.status).toBe(200);
    expect(firstPage.body.data.items).toHaveLength(1);
    expect(firstPage.body.data.items[0].id).toBe(secondLook.id);
    expect(firstPage.body.data.nextCursor).not.toBeNull();

    const secondPage = await request(testApp)
      .get("/api/creator-looks/admin")
      .query({ limit: 1, cursor: firstPage.body.data.nextCursor })
      .set("Authorization", authHeader);

    expect(secondPage.status).toBe(200);
    expect(secondPage.body.data.items).toHaveLength(1);
    expect(secondPage.body.data.items[0].id).toBe(firstLook.id);
    expect(secondPage.body.data.nextCursor).toBeNull();
  });
});
