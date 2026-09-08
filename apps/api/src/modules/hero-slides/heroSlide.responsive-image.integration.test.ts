import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import {
  HeroSlideStatus,
  ImageProcessingPriorityTier,
  ImageProcessingQualityTier,
  ImageProcessingStatus,
  UserRole,
} from "#generated/prisma/enums.js";
import { redis } from "#redis/redis.client.js";
import { testApp } from "#test/integration/testApp.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

beforeEach(async () => {
  await redis.flushdb();
});

const createOwner = () =>
  prisma.user.create({
    data: {
      email: `${randomUUID()}@outfiqe.test`,
      name: "Admin",
      handle: `admin-${randomUUID().slice(0, 8)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role: UserRole.ADMIN,
    },
  });

const createCompletedAsset = (ownerId: string) =>
  prisma.imageProcessingAsset.create({
    data: {
      ownerId,
      checksum: randomUUID().replace(/-/g, ""),
      priorityTier: ImageProcessingPriorityTier.STANDARD,
      qualityTier: ImageProcessingQualityTier.STANDARD,
      status: ImageProcessingStatus.COMPLETED,
      tempStorageKey: `temp/${randomUUID()}.jpg`,
      lqip: "data:image/webp;base64,blur",
      encodedVariants: [
        { width: 640, format: "avif", storageKey: "variants/hero/640w.avif", bytes: 20 },
        { width: 640, format: "webp", storageKey: "variants/hero/640w.webp", bytes: 24 },
      ],
    },
  });

const createPublishedSlide = (imageUrl: string, imageAssetId: string | null) =>
  prisma.heroSlide.create({
    data: {
      tag: "New",
      title: "Fresh drops",
      description: "This week's arrivals",
      imageUrl,
      imageAssetId,
      ctaLabel: "Shop now",
      ctaHref: "/shop",
      status: HeroSlideStatus.PUBLISHED,
    },
  });

describe("GET /api/hero-slides responsive image", () => {
  it("exposes per-format sources from a completed image asset", async () => {
    const imageUrl = `https://cdn.outfiqe.test/uploads/${randomUUID()}.jpg`;
    const owner = await createOwner();
    const asset = await createCompletedAsset(owner.id);
    await createPublishedSlide(imageUrl, asset.id);

    const response = await request(testApp).get("/api/hero-slides");

    expect(response.status).toBe(200);
    const slide = response.body.data.find(
      (candidate: { imageUrl: string }) => candidate.imageUrl === imageUrl,
    );
    expect(slide.image.lqip).toBe("data:image/webp;base64,blur");
    expect(slide.image.sources.map((source: { format: string }) => source.format)).toEqual([
      "avif",
      "webp",
    ]);
  });

  it("falls back to a source-less image when the slide has no processed asset", async () => {
    const imageUrl = `https://cdn.outfiqe.test/uploads/${randomUUID()}.jpg`;
    await createPublishedSlide(imageUrl, null);

    const response = await request(testApp).get("/api/hero-slides");

    const slide = response.body.data.find(
      (candidate: { imageUrl: string }) => candidate.imageUrl === imageUrl,
    );
    expect(slide.image).toEqual({ url: imageUrl, lqip: null, sources: [] });
  });
});
