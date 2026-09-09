import { randomUUID } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "#db/prisma.js";
import { DomainEvents, eventBus } from "#events/event-bus.js";
import { BrandTagReviewPolicy, CreatorStatus, ProductStatus } from "#generated/prisma/enums.js";
import { redis } from "#redis/redis.client.js";
import { ensureProductType } from "#test/integration/productFixtures.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

import { runTagReviewReminderDigest, runTagReviewSlaSweep } from "./tagReview.jobs.js";

beforeEach(async () => {
  await redis.flushdb();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const DAY_MS = 24 * 60 * 60 * 1000;

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

const createBrand = (tagReviewPolicy: BrandTagReviewPolicy) =>
  prisma.brand.create({
    data: {
      name: `Brand ${randomUUID().slice(0, 8)}`,
      contactName: "Contact",
      email: `${randomUUID()}@brand.outfiqe.test`,
      phone: uniquePhone(),
      instagram: `@${randomUUID().slice(0, 8)}`,
      tagReviewPolicy,
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
  {
    reviewStatus = "PENDING",
    submittedDaysAgo = 0,
  }: { reviewStatus?: "PENDING" | "APPROVED"; submittedDaysAgo?: number },
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
  await prisma.creatorLookProduct.update({
    where: { id: tag.id },
    data: { submittedAt: new Date(Date.now() - submittedDaysAgo * DAY_MS) },
  });
  return tag;
};

const seedPendingTag = async (
  policy: BrandTagReviewPolicy,
  opts: { reviewStatus?: "PENDING" | "APPROVED"; submittedDaysAgo?: number } = {},
) => {
  const [creator, brand] = await Promise.all([createCreator(), createBrand(policy)]);
  const product = await createProduct(brand.id);
  const tag = await createTag(creator.id, product.id, opts);
  return { creator, brand, product, tag };
};

describe("runTagReviewSlaSweep", () => {
  it("auto-approves a stale pending tag under OPEN and fires the approval events", async () => {
    const publishSpy = vi.spyOn(eventBus, "publish");
    const { creator, product, tag } = await seedPendingTag(BrandTagReviewPolicy.OPEN, {
      submittedDaysAgo: 8,
    });

    const result = await runTagReviewSlaSweep();

    expect(result.approved).toBe(1);
    const stored = await prisma.creatorLookProduct.findUniqueOrThrow({ where: { id: tag.id } });
    expect(stored.reviewStatus).toBe("APPROVED");
    expect(stored.approvalSource).toBe("SLA");
    expect(stored.reviewedById).toBeNull();
    expect(
      (await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).wornByCount,
    ).toBe(1);
    expect(publishSpy).toHaveBeenCalledWith(
      DomainEvents.PRODUCT_TAG_APPROVED,
      expect.objectContaining({ tagId: tag.id, creatorId: creator.id, auto: true }),
    );
    expect(publishSpy).toHaveBeenCalledWith(
      DomainEvents.PRODUCT_TAGGED,
      expect.objectContaining({ productId: product.id }),
    );
  });

  it("leaves an APPROVAL_REQUIRED brand's stale tag pending", async () => {
    const { tag } = await seedPendingTag(BrandTagReviewPolicy.APPROVAL_REQUIRED, {
      submittedDaysAgo: 30,
    });

    await runTagReviewSlaSweep();

    expect(
      (await prisma.creatorLookProduct.findUniqueOrThrow({ where: { id: tag.id } })).reviewStatus,
    ).toBe("PENDING");
  });

  it("leaves a fresh pending tag alone", async () => {
    const { tag } = await seedPendingTag(BrandTagReviewPolicy.TRUSTED_ONLY, {
      submittedDaysAgo: 2,
    });

    const result = await runTagReviewSlaSweep();

    expect(result.approved).toBe(0);
    expect(
      (await prisma.creatorLookProduct.findUniqueOrThrow({ where: { id: tag.id } })).reviewStatus,
    ).toBe("PENDING");
  });
});

describe("runTagReviewReminderDigest", () => {
  it("emits one TAG_REVIEW_REMINDER_DUE per brand with a standing backlog", async () => {
    const publishSpy = vi.spyOn(eventBus, "publish");
    const { creator, brand, product } = await seedPendingTag(BrandTagReviewPolicy.TRUSTED_ONLY, {
      submittedDaysAgo: 3,
    });
    await createTag(creator.id, product.id, { submittedDaysAgo: 3 });

    const result = await runTagReviewReminderDigest();

    expect(result.brandsNotified).toBe(1);
    expect(publishSpy).toHaveBeenCalledWith(DomainEvents.TAG_REVIEW_REMINDER_DUE, {
      brandId: brand.id,
      pendingCount: 2,
    });
  });

  it("ignores a brand whose pending tags are all younger than a day", async () => {
    const publishSpy = vi.spyOn(eventBus, "publish");
    await seedPendingTag(BrandTagReviewPolicy.TRUSTED_ONLY, { submittedDaysAgo: 0 });

    const result = await runTagReviewReminderDigest();

    expect(result.brandsNotified).toBe(0);
    expect(publishSpy).not.toHaveBeenCalledWith(
      DomainEvents.TAG_REVIEW_REMINDER_DUE,
      expect.anything(),
    );
  });
});
