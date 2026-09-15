import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { CreatorStatus, UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { CONTENT_MODERATE_PERMISSION_KEY } from "#modules/platform-access/platform-access.constants.js";
import { redis } from "#redis/redis.client.js";
import {
  createAdminSession,
  createAdminSessionWithPlatformPermissions,
} from "#test/integration/authHelpers.js";
import { testApp } from "#test/integration/testApp.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

beforeEach(async () => {
  await redis.flushdb();
});

const REAL_BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36";

const authFor = (userId: string, role: UserRole = UserRole.CUSTOMER) => {
  const { accessToken } = generateTokenpair({ sub: userId, role });
  return `Bearer ${accessToken}`;
};

const createCreator = (name = "Creator") =>
  prisma.user.create({
    data: {
      email: `${randomUUID()}@creator.outfiqe.test`,
      name,
      handle: `cr-${randomUUID().slice(0, 8)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      isCreator: true,
      creatorStatus: CreatorStatus.APPROVED,
    },
  });

const createLook = async (creatorId: string, caption = "A look") =>
  prisma.creatorLook.create({
    data: { creatorId, imageUrl: `https://cdn.outfiqe.test/${randomUUID()}.jpg`, caption },
  });

const createComment = async (creatorLookId: string, userId: string, body = "A comment") =>
  prisma.creatorLookComment.create({ data: { creatorLookId, userId, body } });

describe("POST /api/content-reports", () => {
  it("records a public report against a live post", async () => {
    const creator = await createCreator();
    const look = await createLook(creator.id, "Reported look");

    const response = await request(testApp)
      .post("/api/content-reports")
      .set("User-Agent", REAL_BROWSER_UA)
      .send({ targetType: "CREATOR_LOOK", targetId: look.id, reason: "SPAM" });

    expect(response.status).toBe(202);
    const stored = await prisma.contentReport.findFirstOrThrow({
      where: { targetId: look.id },
    });
    expect(stored).toMatchObject({
      targetType: "CREATOR_LOOK",
      reason: "SPAM",
      status: "OPEN",
    });
  });

  it("records a public report against a live comment", async () => {
    const creator = await createCreator();
    const commenter = await createCreator("Commenter");
    const look = await createLook(creator.id);
    const comment = await createComment(look.id, commenter.id, "Not nice");

    const response = await request(testApp)
      .post("/api/content-reports")
      .set("User-Agent", REAL_BROWSER_UA)
      .send({
        targetType: "CREATOR_LOOK_COMMENT",
        targetId: comment.id,
        reason: "HARASSMENT_OR_BULLYING",
      });

    expect(response.status).toBe(202);
    const stored = await prisma.contentReport.findFirstOrThrow({
      where: { targetId: comment.id },
    });
    expect(stored).toMatchObject({
      targetType: "CREATOR_LOOK_COMMENT",
      reason: "HARASSMENT_OR_BULLYING",
    });
  });

  it("404s a report for a post that's already been removed", async () => {
    const creator = await createCreator();
    const look = await createLook(creator.id);
    await prisma.creatorLook.update({ where: { id: look.id }, data: { deletedAt: new Date() } });

    const response = await request(testApp)
      .post("/api/content-reports")
      .set("User-Agent", REAL_BROWSER_UA)
      .send({ targetType: "CREATOR_LOOK", targetId: look.id, reason: "SPAM" });

    expect(response.status).toBe(404);
  });

  it("silently drops a bot report", async () => {
    const creator = await createCreator();
    const look = await createLook(creator.id);

    const response = await request(testApp)
      .post("/api/content-reports")
      .set("User-Agent", "python-requests/2.31.0")
      .send({ targetType: "CREATOR_LOOK", targetId: look.id, reason: "SPAM" });

    expect(response.status).toBe(202);
    expect(await prisma.contentReport.count()).toBe(0);
  });

  it("422s an OTHER report with no note", async () => {
    const creator = await createCreator();
    const look = await createLook(creator.id);

    const response = await request(testApp)
      .post("/api/content-reports")
      .set("User-Agent", REAL_BROWSER_UA)
      .send({ targetType: "CREATOR_LOOK", targetId: look.id, reason: "OTHER" });

    expect(response.status).toBe(422);
  });

  it("rejects a platform admin filing a public report", async () => {
    const { authHeader, userId } = await createAdminSession();
    const creator = await createCreator();
    const look = await createLook(creator.id);

    const response = await request(testApp)
      .post("/api/content-reports")
      .set("User-Agent", REAL_BROWSER_UA)
      .set("Authorization", authHeader)
      .send({ targetType: "CREATOR_LOOK", targetId: look.id, reason: "SPAM" });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("ADMIN_CANNOT_REPORT");
    expect(await prisma.contentReport.count({ where: { reportedById: userId } })).toBe(0);
  });

  it("still accepts an anonymous report with no reporter to check", async () => {
    const creator = await createCreator();
    const look = await createLook(creator.id);

    const response = await request(testApp)
      .post("/api/content-reports")
      .set("User-Agent", REAL_BROWSER_UA)
      .send({ targetType: "CREATOR_LOOK", targetId: look.id, reason: "SPAM" });

    expect(response.status).toBe(202);
  });
});

describe("GET /api/content-reports", () => {
  it("403s a non-platform user", async () => {
    const response = await request(testApp)
      .get("/api/content-reports")
      .set("Authorization", authFor(randomUUID()));

    expect(response.status).toBe(403);
  });

  it("lists reports with the target preview, author, and reporter name", async () => {
    const { authHeader } = await createAdminSession();
    const creator = await createCreator("Flagged Creator");
    const look = await createLook(creator.id, "Reported caption");
    await request(testApp)
      .post("/api/content-reports")
      .set("User-Agent", REAL_BROWSER_UA)
      .send({ targetType: "CREATOR_LOOK", targetId: look.id, reason: "SPAM" });

    const response = await request(testApp)
      .get("/api/content-reports")
      .set("Authorization", authHeader);

    expect(response.status).toBe(200);
    const [item] = response.body.data.items;
    expect(item.target).toMatchObject({
      lookId: look.id,
      snippet: "Reported caption",
      isRemoved: false,
      author: { id: creator.id, handle: creator.handle },
    });
  });

  it("marks an already-removed target's preview as removed", async () => {
    const { authHeader } = await createAdminSession();
    const creator = await createCreator();
    const look = await createLook(creator.id);
    await request(testApp)
      .post("/api/content-reports")
      .set("User-Agent", REAL_BROWSER_UA)
      .send({ targetType: "CREATOR_LOOK", targetId: look.id, reason: "SPAM" });
    await prisma.creatorLook.update({ where: { id: look.id }, data: { deletedAt: new Date() } });

    const response = await request(testApp)
      .get("/api/content-reports")
      .set("Authorization", authHeader);

    expect(response.body.data.items[0].target.isRemoved).toBe(true);
  });
});

describe("GET /api/content-reports/open-count", () => {
  it("counts only open reports", async () => {
    const { authHeader } = await createAdminSession();
    const creator = await createCreator();
    const look = await createLook(creator.id);
    await request(testApp)
      .post("/api/content-reports")
      .set("User-Agent", REAL_BROWSER_UA)
      .send({ targetType: "CREATOR_LOOK", targetId: look.id, reason: "SPAM" });

    const response = await request(testApp)
      .get("/api/content-reports/open-count")
      .set("Authorization", authHeader);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ openCount: 1 });
  });
});

describe("POST /api/content-reports/:id/resolve", () => {
  it("dismisses a report without needing the content-moderate permission", async () => {
    const { authHeader, userId } = await createAdminSession();
    const creator = await createCreator();
    const look = await createLook(creator.id);
    await request(testApp)
      .post("/api/content-reports")
      .set("User-Agent", REAL_BROWSER_UA)
      .send({ targetType: "CREATOR_LOOK", targetId: look.id, reason: "SPAM" });
    const report = await prisma.contentReport.findFirstOrThrow();

    const response = await request(testApp)
      .post(`/api/content-reports/${report.id}/resolve`)
      .set("Authorization", authHeader)
      .send({ action: "DISMISS", note: "Looks fine." });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ contentRemoved: false });
    const stored = await prisma.contentReport.findUniqueOrThrow({ where: { id: report.id } });
    expect(stored).toMatchObject({ status: "DISMISSED", resolvedById: userId });

    const storedLook = await prisma.creatorLook.findUniqueOrThrow({ where: { id: look.id } });
    expect(storedLook.deletedAt).toBeNull();
  });

  it("403s a coarse admin without the content-moderate permission trying to remove content", async () => {
    const { authHeader } = await createAdminSession();
    const creator = await createCreator();
    const look = await createLook(creator.id);
    await request(testApp)
      .post("/api/content-reports")
      .set("User-Agent", REAL_BROWSER_UA)
      .send({ targetType: "CREATOR_LOOK", targetId: look.id, reason: "SPAM" });
    const report = await prisma.contentReport.findFirstOrThrow();

    const response = await request(testApp)
      .post(`/api/content-reports/${report.id}/resolve`)
      .set("Authorization", authHeader)
      .send({ action: "REMOVE_CONTENT" });

    expect(response.status).toBe(403);
    const storedLook = await prisma.creatorLook.findUniqueOrThrow({ where: { id: look.id } });
    expect(storedLook.deletedAt).toBeNull();
  });

  it("removes a reported post, bumps the author's flag count, and audit-logs it", async () => {
    const { authHeader, userId: moderatorId } = await createAdminSessionWithPlatformPermissions(
      CONTENT_MODERATE_PERMISSION_KEY,
    );
    const creator = await createCreator();
    const look = await createLook(creator.id);
    await request(testApp)
      .post("/api/content-reports")
      .set("User-Agent", REAL_BROWSER_UA)
      .send({ targetType: "CREATOR_LOOK", targetId: look.id, reason: "SPAM" });
    const report = await prisma.contentReport.findFirstOrThrow();

    const response = await request(testApp)
      .post(`/api/content-reports/${report.id}/resolve`)
      .set("Authorization", authHeader)
      .send({ action: "REMOVE_CONTENT", note: "Confirmed spam." });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ contentRemoved: true });

    const storedLook = await prisma.creatorLook.findUniqueOrThrow({ where: { id: look.id } });
    expect(storedLook.deletedAt).not.toBeNull();

    const storedCreator = await prisma.user.findUniqueOrThrow({ where: { id: creator.id } });
    expect(storedCreator.contentFlagCount).toBe(1);

    const storedReport = await prisma.contentReport.findUniqueOrThrow({ where: { id: report.id } });
    expect(storedReport).toMatchObject({ status: "ACTIONED", resolvedById: moderatorId });

    const auditLog = await prisma.platformAuditLog.findFirst({
      where: { targetType: "CreatorLook", targetId: look.id },
    });
    expect(auditLog).toMatchObject({ actorUserId: moderatorId, onBehalfOfUserId: creator.id });
  });

  it("removes a reported comment", async () => {
    const { authHeader } = await createAdminSessionWithPlatformPermissions(
      CONTENT_MODERATE_PERMISSION_KEY,
    );
    const creator = await createCreator();
    const commenter = await createCreator("Reported Commenter");
    const look = await createLook(creator.id);
    const comment = await createComment(look.id, commenter.id);
    await request(testApp)
      .post("/api/content-reports")
      .set("User-Agent", REAL_BROWSER_UA)
      .send({ targetType: "CREATOR_LOOK_COMMENT", targetId: comment.id, reason: "HATE_SPEECH" });
    const report = await prisma.contentReport.findFirstOrThrow();

    const response = await request(testApp)
      .post(`/api/content-reports/${report.id}/resolve`)
      .set("Authorization", authHeader)
      .send({ action: "REMOVE_CONTENT" });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ contentRemoved: true });
    const storedComment = await prisma.creatorLookComment.findUniqueOrThrow({
      where: { id: comment.id },
    });
    expect(storedComment.deletedAt).not.toBeNull();
  });

  it("resolves cleanly without erroring when the content was already removed another way", async () => {
    const { authHeader } = await createAdminSessionWithPlatformPermissions(
      CONTENT_MODERATE_PERMISSION_KEY,
    );
    const creator = await createCreator();
    const look = await createLook(creator.id);
    await request(testApp)
      .post("/api/content-reports")
      .set("User-Agent", REAL_BROWSER_UA)
      .send({ targetType: "CREATOR_LOOK", targetId: look.id, reason: "SPAM" });
    const report = await prisma.contentReport.findFirstOrThrow();
    await prisma.creatorLook.update({ where: { id: look.id }, data: { deletedAt: new Date() } });

    const response = await request(testApp)
      .post(`/api/content-reports/${report.id}/resolve`)
      .set("Authorization", authHeader)
      .send({ action: "REMOVE_CONTENT" });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ contentRemoved: false });
    const storedReport = await prisma.contentReport.findUniqueOrThrow({ where: { id: report.id } });
    expect(storedReport.status).toBe("ACTIONED");
  });

  it("409s a report that's already resolved", async () => {
    const { authHeader } = await createAdminSession();
    const creator = await createCreator();
    const look = await createLook(creator.id);
    await request(testApp)
      .post("/api/content-reports")
      .set("User-Agent", REAL_BROWSER_UA)
      .send({ targetType: "CREATOR_LOOK", targetId: look.id, reason: "SPAM" });
    const report = await prisma.contentReport.findFirstOrThrow();
    await request(testApp)
      .post(`/api/content-reports/${report.id}/resolve`)
      .set("Authorization", authHeader)
      .send({ action: "DISMISS" });

    const second = await request(testApp)
      .post(`/api/content-reports/${report.id}/resolve`)
      .set("Authorization", authHeader)
      .send({ action: "DISMISS" });

    expect(second.status).toBe(409);
  });

  it("requires authentication", async () => {
    const response = await request(testApp).post(`/api/content-reports/${randomUUID()}/resolve`);

    expect(response.status).toBe(401);
  });
});
