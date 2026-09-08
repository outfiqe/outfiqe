import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import {
  CollectionStatus,
  ImageProcessingPriorityTier,
  ImageProcessingQualityTier,
  ImageProcessingStatus,
  UserRole,
} from "#generated/prisma/enums.js";
import { testApp } from "#test/integration/testApp.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

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
        { width: 640, format: "avif", storageKey: "variants/coll/640w.avif", bytes: 20 },
        { width: 640, format: "webp", storageKey: "variants/coll/640w.webp", bytes: 24 },
      ],
    },
  });

const createPublishedCollection = (imageUrl: string, imageAssetId: string | null) =>
  prisma.collection.create({
    data: {
      name: "Winter edit",
      slug: `winter-${randomUUID().slice(0, 8)}`,
      imageUrl,
      imageAssetId,
      status: CollectionStatus.PUBLISHED,
    },
  });

describe("GET /api/collections responsive image", () => {
  it("exposes per-format sources from a completed image asset", async () => {
    const imageUrl = `https://cdn.outfiqe.test/uploads/${randomUUID()}.jpg`;
    const owner = await createOwner();
    const asset = await createCompletedAsset(owner.id);
    await createPublishedCollection(imageUrl, asset.id);

    const response = await request(testApp).get("/api/collections");

    expect(response.status).toBe(200);
    const collection = response.body.data.collections.find(
      (candidate: { imageUrl: string }) => candidate.imageUrl === imageUrl,
    );
    expect(collection.image.lqip).toBe("data:image/webp;base64,blur");
    expect(collection.image.sources.map((source: { format: string }) => source.format)).toEqual([
      "avif",
      "webp",
    ]);
  });

  it("falls back to a source-less image when the collection has no processed asset", async () => {
    const imageUrl = `https://cdn.outfiqe.test/uploads/${randomUUID()}.jpg`;
    await createPublishedCollection(imageUrl, null);

    const response = await request(testApp).get("/api/collections");

    const collection = response.body.data.collections.find(
      (candidate: { imageUrl: string }) => candidate.imageUrl === imageUrl,
    );
    expect(collection.image).toEqual({ url: imageUrl, lqip: null, sources: [] });
  });
});
