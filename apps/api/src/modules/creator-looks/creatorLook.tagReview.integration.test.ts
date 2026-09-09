import { randomUUID } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { env } from "#config/env.config.js";
import { prisma } from "#db/prisma.js";
import { DomainEvents, eventBus } from "#events/event-bus.js";
import {
  BrandTagReviewPolicy,
  CreatorStatus,
  PaymentMethod,
  PaymentStatus,
  ProductStatus,
} from "#generated/prisma/enums.js";
import { redis } from "#redis/redis.client.js";
import { ensureProductType } from "#test/integration/productFixtures.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

import { creatorLookService } from "./creatorLook.service.js";

let originalFlag: boolean;

beforeEach(async () => {
  await redis.flushdb();
  originalFlag = env.TAG_REVIEW_ENABLED;
  env.TAG_REVIEW_ENABLED = true;
});

afterEach(() => {
  env.TAG_REVIEW_ENABLED = originalFlag;
  vi.restoreAllMocks();
});

const createCreator = () =>
  prisma.user.create({
    data: {
      email: `${randomUUID()}@creator.outfiqe.test`,
      name: "Tag Review Creator",
      handle: `trc-${randomUUID().slice(0, 8)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      isCreator: true,
      creatorStatus: CreatorStatus.APPROVED,
    },
  });

const createBrand = (tagReviewPolicy: BrandTagReviewPolicy, autoApproveVerifiedBuyers = true) =>
  prisma.brand.create({
    data: {
      name: `Tag Review Brand ${randomUUID().slice(0, 8)}`,
      contactName: "Brand Contact",
      email: `${randomUUID()}@brand.outfiqe.test`,
      phone: uniquePhone(),
      instagram: `@${randomUUID().slice(0, 8)}`,
      tagReviewPolicy,
      autoApproveVerifiedBuyers,
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

const settlePurchase = async (userId: string, productId: string) => {
  const size = await prisma.productSize.create({
    data: { productId, label: `M-${randomUUID().slice(0, 6)}`, stock: 10 },
  });
  return prisma.order.create({
    data: {
      userId,
      fullName: "Buyer",
      phone: uniquePhone(),
      address: "1 Test Rd",
      city: "Kathmandu",
      paymentMethod: PaymentMethod.ESEWA,
      paymentStatus: PaymentStatus.PAID,
      subtotal: 1200,
      deliveryFee: 0,
      total: 1200,
      items: {
        create: { productId, sizeId: size.id, qty: 1, unitPrice: 1200, listUnitPrice: 1200 },
      },
    },
  });
};

const postLook = (creatorId: string, productId: string) =>
  creatorLookService.create(creatorId, {
    imageUrls: [`https://cdn.outfiqe.test/${randomUUID()}.jpg`],
    caption: "look",
    taggedProducts: [{ productId, sizeWorn: "M" }],
  });

const tagFor = (lookId: string, productId: string) =>
  prisma.creatorLookProduct.findUniqueOrThrow({
    where: { creatorLookId_productId: { creatorLookId: lookId, productId } },
  });

describe("tag review on create", () => {
  it("auto-approves every tag as POLICY_OPEN when the feature flag is off", async () => {
    env.TAG_REVIEW_ENABLED = false;
    const [creator, brand] = await Promise.all([
      createCreator(),
      createBrand(BrandTagReviewPolicy.APPROVAL_REQUIRED),
    ]);
    const product = await createProduct(brand.id);

    const look = await postLook(creator.id, product.id);
    const tag = await tagFor(look.id, product.id);

    expect(tag.reviewStatus).toBe("APPROVED");
    expect(tag.approvalSource).toBe("POLICY_OPEN");
  });

  it("auto-approves under an OPEN brand", async () => {
    const [creator, brand] = await Promise.all([
      createCreator(),
      createBrand(BrandTagReviewPolicy.OPEN),
    ]);
    const product = await createProduct(brand.id);

    const look = await postLook(creator.id, product.id);

    expect((await tagFor(look.id, product.id)).approvalSource).toBe("POLICY_OPEN");
  });

  it("holds an untrusted creator's tag under TRUSTED_ONLY and emits PRODUCT_TAG_SUBMITTED", async () => {
    const publishSpy = vi.spyOn(eventBus, "publish");
    const [creator, brand] = await Promise.all([
      createCreator(),
      createBrand(BrandTagReviewPolicy.TRUSTED_ONLY),
    ]);
    const product = await createProduct(brand.id);

    const look = await postLook(creator.id, product.id);
    const tag = await tagFor(look.id, product.id);

    expect(tag.reviewStatus).toBe("PENDING");
    expect(tag.approvalSource).toBeNull();
    expect(publishSpy).toHaveBeenCalledWith(DomainEvents.PRODUCT_TAG_SUBMITTED, {
      lookId: look.id,
      creatorId: creator.id,
      productId: product.id,
      brandId: brand.id,
    });
    expect(publishSpy).not.toHaveBeenCalledWith(
      DomainEvents.PRODUCT_TAGGED,
      expect.objectContaining({ productId: product.id }),
    );
    expect(
      (await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).wornByCount,
    ).toBe(0);
  });

  it("auto-approves a creator the brand explicitly trusts under TRUSTED_ONLY", async () => {
    const [creator, brand] = await Promise.all([
      createCreator(),
      createBrand(BrandTagReviewPolicy.TRUSTED_ONLY),
    ]);
    const product = await createProduct(brand.id);
    await prisma.brandTrustedCreator.create({
      data: { brandId: brand.id, creatorId: creator.id },
    });

    const look = await postLook(creator.id, product.id);

    expect((await tagFor(look.id, product.id)).approvalSource).toBe("TRUSTED_CREATOR");
  });

  it("auto-approves a verified buyer even under APPROVAL_REQUIRED", async () => {
    const [creator, brand] = await Promise.all([
      createCreator(),
      createBrand(BrandTagReviewPolicy.APPROVAL_REQUIRED),
    ]);
    const product = await createProduct(brand.id);
    await settlePurchase(creator.id, product.id);

    const look = await postLook(creator.id, product.id);

    expect((await tagFor(look.id, product.id)).approvalSource).toBe("VERIFIED_BUYER");
  });

  it("still holds a verified buyer when the brand turned the toggle off", async () => {
    const [creator, brand] = await Promise.all([
      createCreator(),
      createBrand(BrandTagReviewPolicy.APPROVAL_REQUIRED, false),
    ]);
    const product = await createProduct(brand.id);
    await settlePurchase(creator.id, product.id);

    const look = await postLook(creator.id, product.id);

    expect((await tagFor(look.id, product.id)).reviewStatus).toBe("PENDING");
  });
});

describe("tag review on edit", () => {
  const editCaption = (creatorId: string, lookId: string, productId: string, caption: string) =>
    creatorLookService.update(lookId, creatorId, {
      imageUrls: [`https://cdn.outfiqe.test/${randomUUID()}.jpg`],
      caption,
      taggedProducts: [{ productId, sizeWorn: "M" }],
    });

  it("preserves an already-approved surviving tag across an edit", async () => {
    const [creator, brand] = await Promise.all([
      createCreator(),
      createBrand(BrandTagReviewPolicy.TRUSTED_ONLY),
    ]);
    const product = await createProduct(brand.id);
    const look = await postLook(creator.id, product.id);
    await prisma.creatorLookProduct.update({
      where: { creatorLookId_productId: { creatorLookId: look.id, productId: product.id } },
      data: { reviewStatus: "APPROVED", approvalSource: "BRAND", reviewedAt: new Date() },
    });

    await editCaption(creator.id, look.id, product.id, "edited");

    const tag = await tagFor(look.id, product.id);
    expect(tag.reviewStatus).toBe("APPROVED");
    expect(tag.approvalSource).toBe("BRAND");
    expect(tag.reRequestCount).toBe(0);
  });

  it("re-requests a rejected surviving tag up to the cap, then leaves it rejected", async () => {
    const [creator, brand] = await Promise.all([
      createCreator(),
      createBrand(BrandTagReviewPolicy.TRUSTED_ONLY),
    ]);
    const product = await createProduct(brand.id);
    const look = await postLook(creator.id, product.id);

    const reject = () =>
      prisma.creatorLookProduct.update({
        where: { creatorLookId_productId: { creatorLookId: look.id, productId: product.id } },
        data: { reviewStatus: "REJECTED", rejectionReason: "NOT_OUR_PRODUCT" },
      });

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      await reject();
      await editCaption(creator.id, look.id, product.id, `edit ${attempt}`);
      const tag = await tagFor(look.id, product.id);
      expect(tag.reviewStatus).toBe("PENDING");
      expect(tag.reRequestCount).toBe(attempt);
      expect(tag.rejectionReason).toBeNull();
    }

    await reject();
    await editCaption(creator.id, look.id, product.id, "edit past cap");
    expect((await tagFor(look.id, product.id)).reviewStatus).toBe("REJECTED");
  });

  it("recounts wornBy when an approved tag is removed in an edit", async () => {
    const [creator, brand] = await Promise.all([
      createCreator(),
      createBrand(BrandTagReviewPolicy.OPEN),
    ]);
    const [keptProduct, removedProduct] = await Promise.all([
      createProduct(brand.id),
      createProduct(brand.id),
    ]);
    const look = await creatorLookService.create(creator.id, {
      imageUrls: [`https://cdn.outfiqe.test/${randomUUID()}.jpg`],
      caption: "two tags",
      taggedProducts: [
        { productId: keptProduct.id, sizeWorn: "M" },
        { productId: removedProduct.id, sizeWorn: "M" },
      ],
    });
    expect(
      (await prisma.product.findUniqueOrThrow({ where: { id: removedProduct.id } })).wornByCount,
    ).toBe(1);

    await editCaption(creator.id, look.id, keptProduct.id, "dropped one");

    expect(
      (await prisma.product.findUniqueOrThrow({ where: { id: removedProduct.id } })).wornByCount,
    ).toBe(0);
    expect(
      (await prisma.product.findUniqueOrThrow({ where: { id: keptProduct.id } })).wornByCount,
    ).toBe(1);
  });
});
