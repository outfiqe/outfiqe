import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { CreatorStatus, ProductStatus, TagReviewStatus } from "#generated/prisma/enums.js";
import { resolveAttribution } from "#modules/orders/order.attribution.utils.js";
import { productService } from "#modules/products/product.service.js";
import { redis } from "#redis/redis.client.js";
import { ensureProductType } from "#test/integration/productFixtures.js";
import { testApp } from "#test/integration/testApp.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

beforeEach(async () => {
  await redis.flushdb();
});

const createCreator = () =>
  prisma.user.create({
    data: {
      email: `${randomUUID()}@creator.outfiqe.test`,
      name: "Visibility Creator",
      handle: `vc-${randomUUID().slice(0, 8)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      isCreator: true,
      creatorStatus: CreatorStatus.APPROVED,
    },
  });

const createProduct = async (name: string) => {
  const brand = await prisma.brand.create({
    data: {
      name: `${name} Brand ${randomUUID().slice(0, 6)}`,
      contactName: "Brand Contact",
      email: `${randomUUID()}@brand.outfiqe.test`,
      phone: uniquePhone(),
      instagram: `@${randomUUID().slice(0, 8)}`,
    },
  });
  return prisma.product.create({
    data: {
      brandId: brand.id,
      name,
      price: 1500,
      productTypeId: await ensureProductType(),
      status: ProductStatus.APPROVED,
      imageUrl: `https://cdn.outfiqe.test/${randomUUID()}.jpg`,
    },
  });
};

const createLookWithTags = async (
  creatorId: string,
  tags: { productId: string; reviewStatus: TagReviewStatus }[],
) => {
  const look = await prisma.creatorLook.create({
    data: {
      creatorId,
      imageUrl: `https://cdn.outfiqe.test/${randomUUID()}.jpg`,
      caption: `visibility ${randomUUID().slice(0, 6)}`,
      taggedProducts: {
        create: tags.map((tag) => ({
          productId: tag.productId,
          sizeWorn: "M",
          reviewStatus: tag.reviewStatus,
        })),
      },
    },
  });
  await Promise.all(tags.map((tag) => productService.recountWornBy(tag.productId)));
  return look;
};

describe("pending tags are invisible on public read paths", () => {
  it("only exposes approved tags on a deep-linked post and the creator's public feed", async () => {
    const creator = await createCreator();
    const [approved, pending] = await Promise.all([
      createProduct("Approved Jacket"),
      createProduct("Pending Scarf"),
    ]);
    const look = await createLookWithTags(creator.id, [
      { productId: approved.id, reviewStatus: TagReviewStatus.APPROVED },
      { productId: pending.id, reviewStatus: TagReviewStatus.PENDING },
    ]);

    const deepLink = await request(testApp).get(`/api/creator-looks/${look.id}/public`);
    expect(deepLink.body.data.taggedProducts.map((product: { id: string }) => product.id)).toEqual([
      approved.id,
    ]);

    const creatorFeed = await request(testApp).get(
      `/api/creators/by-handle/${creator.handle}/looks`,
    );
    const feedPost = creatorFeed.body.data.posts.find(
      (post: { id: string }) => post.id === look.id,
    );
    expect(feedPost.taggedProducts.map((product: { id: string }) => product.id)).toEqual([
      approved.id,
    ]);
  });

  it("renders an all-pending look with no shopping tags rather than breaking", async () => {
    const creator = await createCreator();
    const pending = await createProduct("All Pending Bag");
    const look = await createLookWithTags(creator.id, [
      { productId: pending.id, reviewStatus: TagReviewStatus.PENDING },
    ]);

    const deepLink = await request(testApp).get(`/api/creator-looks/${look.id}/public`);
    expect(deepLink.status).toBe(200);
    expect(deepLink.body.data.taggedProducts).toEqual([]);
  });

  it("keeps a look out of the featured rail until it has an approved tag", async () => {
    const creator = await createCreator();
    const pending = await createProduct("Rail Pending Hat");
    await createLookWithTags(creator.id, [
      { productId: pending.id, reviewStatus: TagReviewStatus.PENDING },
    ]);

    const rail = await request(testApp).get("/api/creator-looks").query({ limit: 50 });
    const railProductIds = rail.body.data.posts.flatMap(
      (post: { taggedProducts: { id: string }[] }) =>
        post.taggedProducts.map((product) => product.id),
    );
    expect(railProductIds).not.toContain(pending.id);
  });

  it("404s a tag click on a pending tag and records one on an approved tag", async () => {
    const creator = await createCreator();
    const [approved, pending] = await Promise.all([
      createProduct("Clickable Approved"),
      createProduct("Clickable Pending"),
    ]);
    const look = await createLookWithTags(creator.id, [
      { productId: approved.id, reviewStatus: TagReviewStatus.APPROVED },
      { productId: pending.id, reviewStatus: TagReviewStatus.PENDING },
    ]);

    const pendingClick = await request(testApp)
      .post(`/api/creator-looks/${look.id}/tags/${pending.id}/click`)
      .send({ sessionId: randomUUID(), source: "FEED" });
    expect(pendingClick.status).toBe(404);

    const approvedClick = await request(testApp)
      .post(`/api/creator-looks/${look.id}/tags/${approved.id}/click`)
      .send({ sessionId: randomUUID(), source: "FEED" });
    expect(approvedClick.status).toBe(200);
  });

  it("counts and lists only approved-tag creators for wornBy and PDP 'seen on'", async () => {
    const [approvedCreator, pendingCreator] = await Promise.all([createCreator(), createCreator()]);
    const product = await createProduct("Worn Sneaker");

    await createLookWithTags(approvedCreator.id, [
      { productId: product.id, reviewStatus: TagReviewStatus.APPROVED },
    ]);
    await createLookWithTags(pendingCreator.id, [
      { productId: product.id, reviewStatus: TagReviewStatus.PENDING },
    ]);

    expect(
      (await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).wornByCount,
    ).toBe(1);

    const pdp = await request(testApp).get(`/api/products/${product.id}`);
    const seenOnIds = pdp.body.data.seenOnCreators.map(
      (entry: { creatorId: string }) => entry.creatorId,
    );
    expect(seenOnIds).toContain(approvedCreator.id);
    expect(seenOnIds).not.toContain(pendingCreator.id);
  });

  it("stops attributing a tag click once the tag is revoked", async () => {
    const [creator, buyer] = await Promise.all([createCreator(), createCreator()]);
    const product = await createProduct("Revoked Attribution Tee");
    const look = await createLookWithTags(creator.id, [
      { productId: product.id, reviewStatus: TagReviewStatus.APPROVED },
    ]);

    await prisma.creatorLookTagClick.create({
      data: {
        creatorLookId: look.id,
        productId: product.id,
        userId: buyer.id,
        sessionId: randomUUID(),
        source: "FEED",
      },
    });

    const whileApproved = await resolveAttribution(buyer.id, product.id, new Date());
    expect(whileApproved?.creatorId).toBe(creator.id);

    await prisma.creatorLookProduct.updateMany({
      where: { creatorLookId: look.id, productId: product.id },
      data: { reviewStatus: TagReviewStatus.REJECTED, rejectionReason: "COUNTERFEIT_SUSPECTED" },
    });

    const afterRevoke = await resolveAttribution(buyer.id, product.id, new Date());
    expect(afterRevoke).toBeNull();
  });
});
