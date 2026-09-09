import { randomUUID } from "node:crypto";

import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "#db/prisma.js";
import { DomainEvents, eventBus } from "#events/event-bus.js";
import { CreatorStatus, ProductStatus, UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { redis } from "#redis/redis.client.js";
import { createAdminSession } from "#test/integration/authHelpers.js";
import { ensureProductType } from "#test/integration/productFixtures.js";
import { testApp } from "#test/integration/testApp.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

import { escalateCounterfeitTagRemoval } from "./tagReport.events.js";

beforeEach(async () => {
  await redis.flushdb();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const authFor = (userId: string, role: UserRole = UserRole.CUSTOMER) => {
  const { accessToken } = generateTokenpair({ sub: userId, role });
  return `Bearer ${accessToken}`;
};

const createCreator = () =>
  prisma.user.create({
    data: {
      email: `${randomUUID()}@creator.outfiqe.test`,
      name: "Creator",
      handle: `cr-${randomUUID().slice(0, 8)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      isCreator: true,
      creatorStatus: CreatorStatus.APPROVED,
    },
  });

const createProduct = async () => {
  const brand = await prisma.brand.create({
    data: {
      name: `Brand ${randomUUID().slice(0, 8)}`,
      contactName: "Contact",
      email: `${randomUUID()}@brand.outfiqe.test`,
      phone: uniquePhone(),
      instagram: `@${randomUUID().slice(0, 8)}`,
    },
  });
  return prisma.product.create({
    data: {
      brandId: brand.id,
      name: "Contested Coat",
      price: 1200,
      productTypeId: await ensureProductType(),
      status: ProductStatus.APPROVED,
      imageUrl: `https://cdn.outfiqe.test/${randomUUID()}.jpg`,
    },
  });
};

const seedTag = async (reviewStatus: "PENDING" | "APPROVED" = "APPROVED") => {
  const [creator, product] = await Promise.all([createCreator(), createProduct()]);
  const look = await prisma.creatorLook.create({
    data: {
      creatorId: creator.id,
      imageUrl: `https://cdn.outfiqe.test/${randomUUID()}.jpg`,
      caption: "look",
      taggedProducts: { create: { productId: product.id, sizeWorn: "M", reviewStatus } },
    },
    include: { taggedProducts: true },
  });
  const [tag] = look.taggedProducts;
  if (!tag) throw new Error("tag not created");
  return { creator, product, look, tag };
};

const REAL_BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36";

describe("POST /api/tag-reports", () => {
  it("records a public report against a live tag", async () => {
    const { look, product } = await seedTag("APPROVED");

    const response = await request(testApp)
      .post("/api/tag-reports")
      .set("User-Agent", REAL_BROWSER_UA)
      .send({
        lookId: look.id,
        productId: product.id,
        reason: "COUNTERFEIT",
        note: "The logo stitching is wrong.",
      });

    expect(response.status).toBe(202);
    const stored = await prisma.tagReviewReport.findFirstOrThrow({
      where: { creatorLookProduct: { creatorLookId: look.id } },
    });
    expect(stored).toMatchObject({
      source: "PUBLIC_REPORT",
      reason: "COUNTERFEIT",
      status: "OPEN",
      note: "The logo stitching is wrong.",
    });
  });

  it("404s a report for a tag that isn't live", async () => {
    const { look, product } = await seedTag("PENDING");

    const response = await request(testApp)
      .post("/api/tag-reports")
      .set("User-Agent", REAL_BROWSER_UA)
      .send({ lookId: look.id, productId: product.id, reason: "MISLEADING" });

    expect(response.status).toBe(404);
  });

  it("silently drops a bot report", async () => {
    const { look, product } = await seedTag("APPROVED");

    const response = await request(testApp)
      .post("/api/tag-reports")
      .set("User-Agent", "python-requests/2.31.0")
      .send({ lookId: look.id, productId: product.id, reason: "OFFENSIVE", note: "spam" });

    expect(response.status).toBe(202);
    expect(await prisma.tagReviewReport.count()).toBe(0);
  });

  it("422s an OTHER report with no note", async () => {
    const { look, product } = await seedTag("APPROVED");

    const response = await request(testApp)
      .post("/api/tag-reports")
      .set("User-Agent", REAL_BROWSER_UA)
      .send({ lookId: look.id, productId: product.id, reason: "OTHER" });

    expect(response.status).toBe(422);
  });
});

describe("GET /api/tag-reports", () => {
  it("403s a non-platform user", async () => {
    const response = await request(testApp)
      .get("/api/tag-reports")
      .set("Authorization", authFor(randomUUID()));
    expect(response.status).toBe(403);
  });

  it("lists reports with the tag context and the creator's flag count", async () => {
    const { authHeader } = await createAdminSession();
    const { creator, look, product } = await seedTag("APPROVED");
    await prisma.user.update({
      where: { id: creator.id },
      data: { tagCounterfeitFlagCount: 2 },
    });
    await request(testApp)
      .post("/api/tag-reports")
      .set("User-Agent", REAL_BROWSER_UA)
      .send({ lookId: look.id, productId: product.id, reason: "COUNTERFEIT" });

    const response = await request(testApp)
      .get("/api/tag-reports")
      .set("Authorization", authHeader);

    expect(response.status).toBe(200);
    const [item] = response.body.data.items;
    expect(item.tag.creator.handle).toBe(creator.handle);
    expect(item.tag.creator.counterfeitFlagCount).toBe(2);
    expect(item.tag.product.name).toBe("Contested Coat");
  });
});

describe("POST /api/tag-reports/:id/resolve", () => {
  it("dismisses a report", async () => {
    const { authHeader, userId } = await createAdminSession();
    const { look, product } = await seedTag("APPROVED");
    await request(testApp)
      .post("/api/tag-reports")
      .set("User-Agent", REAL_BROWSER_UA)
      .send({ lookId: look.id, productId: product.id, reason: "MISLEADING" });
    const report = await prisma.tagReviewReport.findFirstOrThrow();

    const response = await request(testApp)
      .post(`/api/tag-reports/${report.id}/resolve`)
      .set("Authorization", authHeader)
      .send({ status: "DISMISSED", resolutionNote: "Looks fine to me." });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ tagTakenDown: false });
    const stored = await prisma.tagReviewReport.findUniqueOrThrow({ where: { id: report.id } });
    expect(stored).toMatchObject({ status: "DISMISSED", reviewedById: userId });
  });

  it("takes the tag down and fires the revoke event when asked", async () => {
    const publishSpy = vi.spyOn(eventBus, "publish");
    const { authHeader } = await createAdminSession();
    const { look, product, tag } = await seedTag("APPROVED");
    await prisma.product.update({ where: { id: product.id }, data: { wornByCount: 1 } });
    await request(testApp)
      .post("/api/tag-reports")
      .set("User-Agent", REAL_BROWSER_UA)
      .send({ lookId: look.id, productId: product.id, reason: "COUNTERFEIT" });
    const report = await prisma.tagReviewReport.findFirstOrThrow();

    const response = await request(testApp)
      .post(`/api/tag-reports/${report.id}/resolve`)
      .set("Authorization", authHeader)
      .send({ status: "ACTIONED", takeDownTag: true });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ tagTakenDown: true });
    expect(
      (await prisma.creatorLookProduct.findUniqueOrThrow({ where: { id: tag.id } })).reviewStatus,
    ).toBe("REJECTED");
    expect(
      (await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).wornByCount,
    ).toBe(0);
    expect(publishSpy).toHaveBeenCalledWith(
      DomainEvents.PRODUCT_TAG_REVOKED,
      expect.objectContaining({ tagId: tag.id, reason: "COUNTERFEIT_SUSPECTED" }),
    );
  });

  it("409s a report that's already resolved", async () => {
    const { authHeader } = await createAdminSession();
    const { look, product } = await seedTag("APPROVED");
    await request(testApp)
      .post("/api/tag-reports")
      .set("User-Agent", REAL_BROWSER_UA)
      .send({ lookId: look.id, productId: product.id, reason: "MISLEADING" });
    const report = await prisma.tagReviewReport.findFirstOrThrow();
    await request(testApp)
      .post(`/api/tag-reports/${report.id}/resolve`)
      .set("Authorization", authHeader)
      .send({ status: "DISMISSED" });

    const second = await request(testApp)
      .post(`/api/tag-reports/${report.id}/resolve`)
      .set("Authorization", authHeader)
      .send({ status: "DISMISSED" });

    expect(second.status).toBe(409);
  });
});

describe("escalateCounterfeitTagRemoval", () => {
  it("opens an escalation report and bumps the creator's flag count on a counterfeit rejection", async () => {
    const { creator, tag } = await seedTag("PENDING");

    await escalateCounterfeitTagRemoval({
      tagId: tag.id,
      creatorId: creator.id,
      reason: "COUNTERFEIT_SUSPECTED",
      note: "Fake — sole is stamped wrong.",
    });

    const report = await prisma.tagReviewReport.findFirstOrThrow();
    expect(report).toMatchObject({
      source: "BRAND_COUNTERFEIT_REJECTION",
      reason: "COUNTERFEIT",
      note: "Fake — sole is stamped wrong.",
    });
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: creator.id } })).tagCounterfeitFlagCount,
    ).toBe(1);
  });

  it("ignores a non-counterfeit rejection", async () => {
    const { creator, tag } = await seedTag("PENDING");

    await escalateCounterfeitTagRemoval({
      tagId: tag.id,
      creatorId: creator.id,
      reason: "NOT_OUR_PRODUCT",
      note: null,
    });

    expect(await prisma.tagReviewReport.count()).toBe(0);
  });
});
