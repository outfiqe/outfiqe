import { randomUUID } from "node:crypto";

import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "#db/prisma.js";
import { DomainEvents, eventBus } from "#events/event-bus.js";
import { BrandRole, CreatorStatus, ProductStatus, UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { redis } from "#redis/redis.client.js";
import { ensureProductType } from "#test/integration/productFixtures.js";
import { testApp } from "#test/integration/testApp.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

beforeEach(async () => {
  await redis.flushdb();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const brandOwnerHeader = (userId: string) => {
  const { accessToken } = generateTokenpair({ sub: userId, role: UserRole.BRAND_OWNER });
  return `Bearer ${accessToken}`;
};

const createBrandWithOwner = async () => {
  const brand = await prisma.brand.create({
    data: {
      name: `Brand ${randomUUID().slice(0, 8)}`,
      contactName: "Contact",
      email: `${randomUUID()}@brand.outfiqe.test`,
      phone: uniquePhone(),
      instagram: `@${randomUUID().slice(0, 8)}`,
    },
  });
  const owner = await prisma.user.create({
    data: {
      email: `${randomUUID()}@owner.outfiqe.test`,
      name: "Brand Owner",
      handle: `bo-${randomUUID().slice(0, 8)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role: UserRole.BRAND_OWNER,
    },
  });
  await prisma.brandMembership.create({
    data: { userId: owner.id, brandId: brand.id, role: BrandRole.OWNER },
  });
  return { brand, owner };
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

const createProduct = async (brandId: string) =>
  prisma.product.create({
    data: {
      brandId,
      name: "Tagged Item",
      price: 1200,
      productTypeId: await ensureProductType(),
      status: ProductStatus.APPROVED,
      imageUrl: `https://cdn.outfiqe.test/${randomUUID()}.jpg`,
    },
  });

const createTag = async (
  creatorId: string,
  productId: string,
  reviewStatus: "PENDING" | "APPROVED" = "PENDING",
) => {
  const look = await prisma.creatorLook.create({
    data: {
      creatorId,
      imageUrl: `https://cdn.outfiqe.test/${randomUUID()}.jpg`,
      caption: "look",
      taggedProducts: { create: { productId, sizeWorn: "M", reviewStatus } },
    },
    include: { taggedProducts: true },
  });
  const [tag] = look.taggedProducts;
  if (!tag) throw new Error("tag not created");
  return { look, tag };
};

const seedPendingTag = async () => {
  const [{ brand, owner }, creator] = await Promise.all([createBrandWithOwner(), createCreator()]);
  const product = await createProduct(brand.id);
  const { look, tag } = await createTag(creator.id, product.id);
  return { brand, owner, creator, product, look, tag };
};

describe("GET /api/tag-reviews", () => {
  it("lists the brand's pending tags and hides other brands'", async () => {
    const mine = await seedPendingTag();
    const theirs = await seedPendingTag();

    const response = await request(testApp)
      .get("/api/tag-reviews")
      .set("Authorization", brandOwnerHeader(mine.owner.id));

    expect(response.status).toBe(200);
    const ids = response.body.data.items.map((item: { id: string }) => item.id);
    expect(ids).toContain(mine.tag.id);
    expect(ids).not.toContain(theirs.tag.id);
  });

  it("403s a non-brand-owner", async () => {
    const { accessToken } = generateTokenpair({ sub: randomUUID(), role: UserRole.CUSTOMER });
    const response = await request(testApp)
      .get("/api/tag-reviews")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(response.status).toBe(403);
  });
});

describe("POST /api/tag-reviews/:id/approve", () => {
  it("approves a pending tag, stamps the reviewer, and fires the events", async () => {
    const publishSpy = vi.spyOn(eventBus, "publish");
    const { owner, creator, product, look, tag } = await seedPendingTag();

    const response = await request(testApp)
      .post(`/api/tag-reviews/${tag.id}/approve`)
      .set("Authorization", brandOwnerHeader(owner.id))
      .send({});

    expect(response.status).toBe(200);
    const stored = await prisma.creatorLookProduct.findUniqueOrThrow({ where: { id: tag.id } });
    expect(stored.reviewStatus).toBe("APPROVED");
    expect(stored.approvalSource).toBe("BRAND");
    expect(stored.reviewedById).toBe(owner.id);
    expect(stored.reviewedAt).toBeInstanceOf(Date);
    expect(
      (await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).wornByCount,
    ).toBe(1);
    expect(publishSpy).toHaveBeenCalledWith(DomainEvents.PRODUCT_TAGGED, {
      lookId: look.id,
      creatorId: creator.id,
      productId: product.id,
    });
    expect(publishSpy).toHaveBeenCalledWith(
      DomainEvents.PRODUCT_TAG_APPROVED,
      expect.objectContaining({ tagId: tag.id, auto: false }),
    );
  });

  it("optionally trusts the creator for that brand", async () => {
    const { brand, owner, creator, tag } = await seedPendingTag();

    await request(testApp)
      .post(`/api/tag-reviews/${tag.id}/approve`)
      .set("Authorization", brandOwnerHeader(owner.id))
      .send({ trustCreator: true });

    const trust = await prisma.brandTrustedCreator.findUnique({
      where: { brandId_creatorId: { brandId: brand.id, creatorId: creator.id } },
    });
    expect(trust?.grantedById).toBe(owner.id);
  });

  it("404s when the tag belongs to another brand", async () => {
    const mine = await createBrandWithOwner();
    const theirs = await seedPendingTag();

    const response = await request(testApp)
      .post(`/api/tag-reviews/${theirs.tag.id}/approve`)
      .set("Authorization", brandOwnerHeader(mine.owner.id))
      .send({});
    expect(response.status).toBe(404);
  });

  it("422s when the tag is already approved", async () => {
    const { owner, creator, product } = await seedPendingTag();
    const { tag } = await createTag(creator.id, product.id, "APPROVED");

    const response = await request(testApp)
      .post(`/api/tag-reviews/${tag.id}/approve`)
      .set("Authorization", brandOwnerHeader(owner.id))
      .send({});
    expect(response.status).toBe(422);
  });
});

describe("POST /api/tag-reviews/:id/reject", () => {
  it("rejects a pending tag with a reason and fires PRODUCT_TAG_REJECTED", async () => {
    const publishSpy = vi.spyOn(eventBus, "publish");
    const { owner, tag } = await seedPendingTag();

    const response = await request(testApp)
      .post(`/api/tag-reviews/${tag.id}/reject`)
      .set("Authorization", brandOwnerHeader(owner.id))
      .send({ reason: "NOT_OUR_PRODUCT" });

    expect(response.status).toBe(200);
    const stored = await prisma.creatorLookProduct.findUniqueOrThrow({ where: { id: tag.id } });
    expect(stored.reviewStatus).toBe("REJECTED");
    expect(stored.rejectionReason).toBe("NOT_OUR_PRODUCT");
    expect(stored.reviewedById).toBe(owner.id);
    expect(publishSpy).toHaveBeenCalledWith(
      DomainEvents.PRODUCT_TAG_REJECTED,
      expect.objectContaining({ tagId: tag.id, reason: "NOT_OUR_PRODUCT" }),
    );
  });

  it("422s an OTHER rejection with no note", async () => {
    const { owner, tag } = await seedPendingTag();
    const response = await request(testApp)
      .post(`/api/tag-reviews/${tag.id}/reject`)
      .set("Authorization", brandOwnerHeader(owner.id))
      .send({ reason: "OTHER" });
    expect(response.status).toBe(422);
  });

  it("revokes a live tag: fires PRODUCT_TAG_REVOKED and decrements wornBy", async () => {
    const publishSpy = vi.spyOn(eventBus, "publish");
    const { owner, creator, product } = await seedPendingTag();
    const { tag } = await createTag(creator.id, product.id, "APPROVED");
    await prisma.product.update({ where: { id: product.id }, data: { wornByCount: 1 } });

    const response = await request(testApp)
      .post(`/api/tag-reviews/${tag.id}/reject`)
      .set("Authorization", brandOwnerHeader(owner.id))
      .send({ reason: "COUNTERFEIT_SUSPECTED" });

    expect(response.status).toBe(200);
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
});

describe("PATCH /api/brands/me tag review policy", () => {
  it("persists the policy without touching existing pending tags", async () => {
    const { owner, tag } = await seedPendingTag();

    const response = await request(testApp)
      .patch("/api/brands/me")
      .set("Authorization", brandOwnerHeader(owner.id))
      .send({ tagReviewPolicy: "OPEN", autoApproveVerifiedBuyers: false });

    expect(response.status).toBe(200);
    expect(response.body.data.brand.tagReviewPolicy).toBe("OPEN");
    expect(response.body.data.brand.autoApproveVerifiedBuyers).toBe(false);
    expect(
      (await prisma.creatorLookProduct.findUniqueOrThrow({ where: { id: tag.id } })).reviewStatus,
    ).toBe("PENDING");
  });
});
