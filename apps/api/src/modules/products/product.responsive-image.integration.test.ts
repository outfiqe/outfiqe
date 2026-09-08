import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import {
  ImageProcessingPriorityTier,
  ImageProcessingQualityTier,
  ImageProcessingStatus,
  ProductStatus,
  UserRole,
} from "#generated/prisma/enums.js";
import { ensureProductType } from "#test/integration/productFixtures.js";
import { testApp } from "#test/integration/testApp.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

const ORIGINAL_URL = "https://cdn.outfiqe.test/uploads/jacket-original.jpg";

const createBrand = () =>
  prisma.brand.create({
    data: {
      name: `Image Brand ${randomUUID().slice(0, 6)}`,
      contactName: "Contact",
      email: `${randomUUID()}@brand.outfiqe.test`,
      phone: uniquePhone(),
      instagram: `@${randomUUID().slice(0, 8)}`,
    },
  });

const createBrandOwner = () =>
  prisma.user.create({
    data: {
      email: `${randomUUID()}@outfiqe.test`,
      name: "Owner",
      handle: `owner-${randomUUID().slice(0, 8)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role: UserRole.BRAND_OWNER,
    },
  });

const createCompletedImageAsset = (ownerId: string) =>
  prisma.imageProcessingAsset.create({
    data: {
      ownerId,
      checksum: randomUUID().replace(/-/g, ""),
      priorityTier: ImageProcessingPriorityTier.STANDARD,
      qualityTier: ImageProcessingQualityTier.STANDARD,
      status: ImageProcessingStatus.COMPLETED,
      tempStorageKey: `temp/${randomUUID()}.jpg`,
      tempFileCleanedUp: true,
      originalStorageKey: "originals/abc.jpg",
      thumbnailStorageKey: "thumbnails/abc.webp",
      lqip: "data:image/webp;base64,blur",
      encodedVariants: [
        { width: 320, format: "avif", storageKey: "variants/abc/320w.avif", bytes: 10 },
        { width: 640, format: "avif", storageKey: "variants/abc/640w.avif", bytes: 20 },
        { width: 320, format: "webp", storageKey: "variants/abc/320w.webp", bytes: 12 },
        { width: 320, format: "jpeg", storageKey: "variants/abc/320w.jpg", bytes: 15 },
      ],
      optimizeCompletedAt: new Date(),
      thumbnailCompletedAt: new Date(),
    },
  });

const setUpApprovedProductWithImage = async (imageAssetId: string | null) => {
  const brand = await createBrand();
  const productTypeId = await ensureProductType();
  return prisma.product.create({
    data: {
      brandId: brand.id,
      name: "Responsive Jacket",
      price: 4_200,
      productTypeId,
      status: ProductStatus.APPROVED,
      imageUrl: ORIGINAL_URL,
      images: { create: [{ url: ORIGINAL_URL, sortOrder: 0, imageAssetId }] },
    },
  });
};

describe("GET /api/products/:id responsive image", () => {
  it("returns per-format sources and an lqip built from a completed image asset", async () => {
    const owner = await createBrandOwner();
    const asset = await createCompletedImageAsset(owner.id);
    const product = await setUpApprovedProductWithImage(asset.id);

    const response = await request(testApp).get(`/api/products/${product.id}`);

    expect(response.status).toBe(200);
    const { image, imageUrl } = response.body.data;
    expect(imageUrl).toBe(ORIGINAL_URL);
    expect(image.url).toBe(ORIGINAL_URL);
    expect(image.lqip).toBe("data:image/webp;base64,blur");
    expect(image.sources.map((source: { format: string }) => source.format)).toEqual([
      "avif",
      "webp",
      "jpeg",
    ]);
    const avifSource = image.sources.find((source: { format: string }) => source.format === "avif");
    expect(avifSource.srcSet).toContain("/image-processing-assets/variants/abc/320w.avif 320w");
    expect(avifSource.srcSet).toContain("/image-processing-assets/variants/abc/640w.avif 640w");
  });

  it("falls back to a source-less image when the product image has no processed asset", async () => {
    const product = await setUpApprovedProductWithImage(null);

    const response = await request(testApp).get(`/api/products/${product.id}`);

    expect(response.status).toBe(200);
    expect(response.body.data.image).toEqual({ url: ORIGINAL_URL, lqip: null, sources: [] });
  });
});
