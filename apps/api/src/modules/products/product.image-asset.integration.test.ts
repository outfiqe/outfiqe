import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import {
  BrandRole,
  ImageProcessingPriorityTier,
  ImageProcessingQualityTier,
  ImageProcessingStatus,
  UserRole,
} from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { ensureProductType } from "#test/integration/productFixtures.js";
import { testApp } from "#test/integration/testApp.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

const createBrandOwner = async () => {
  const user = await prisma.user.create({
    data: {
      email: `${randomUUID()}@outfiqe.test`,
      name: "Owner",
      handle: `owner-${randomUUID().slice(0, 8)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role: UserRole.BRAND_OWNER,
    },
  });
  const brand = await prisma.brand.create({
    data: {
      name: `Asset Brand ${randomUUID().slice(0, 6)}`,
      contactName: "Contact",
      email: `${randomUUID()}@brand.outfiqe.test`,
      phone: uniquePhone(),
      instagram: `@${randomUUID().slice(0, 8)}`,
    },
  });
  await prisma.brandMembership.create({
    data: { userId: user.id, brandId: brand.id, role: BrandRole.OWNER },
  });
  return user;
};

const authHeaderFor = (userId: string) => {
  const { accessToken } = generateTokenpair({ sub: userId, role: UserRole.BRAND_OWNER });
  return `Bearer ${accessToken}`;
};

const createSizeOption = async () => {
  const productTypeId = await ensureProductType();
  return prisma.sizeOption.create({
    data: { productTypeId, label: `M-${randomUUID().slice(0, 4)}`, sortOrder: 0 },
  });
};

const createCategory = async () => {
  const slug = `cat-${randomUUID().slice(0, 8)}`;
  await prisma.category.create({ data: { slug, name: "Test Category" } });
  return slug;
};

const createImageAsset = (ownerId: string) =>
  prisma.imageProcessingAsset.create({
    data: {
      ownerId,
      checksum: randomUUID().replace(/-/g, ""),
      priorityTier: ImageProcessingPriorityTier.STANDARD,
      qualityTier: ImageProcessingQualityTier.STANDARD,
      status: ImageProcessingStatus.PENDING,
      tempStorageKey: `temp/${randomUUID()}.jpg`,
    },
  });

const buildProductBody = (sizeOptionId: string, categorySlug: string) => ({
  name: "Asset Linked Jacket",
  price: 3_200,
  type: "tops",
  categories: [categorySlug],
  sizes: [{ sizeOptionId, stock: 4 }],
});

describe("POST /api/products image asset linking", () => {
  it("stores imageAssetId on the created product image at the matching position", async () => {
    const owner = await createBrandOwner();
    const sizeOption = await createSizeOption();
    const categorySlug = await createCategory();
    const asset = await createImageAsset(owner.id);

    const response = await request(testApp)
      .post("/api/products")
      .set("Authorization", authHeaderFor(owner.id))
      .send({
        ...buildProductBody(sizeOption.id, categorySlug),
        imageUrls: ["https://cdn.outfiqe.test/front.jpg", "https://cdn.outfiqe.test/back.jpg"],
        imageAssetIds: [asset.id, null],
      });

    expect(response.status).toBe(201);
    const images = await prisma.productImage.findMany({
      where: { productId: response.body.data.id },
      orderBy: { sortOrder: "asc" },
    });
    expect(images.map((image) => image.imageAssetId)).toEqual([asset.id, null]);
  });

  it("rejects an image asset that belongs to a different user", async () => {
    const owner = await createBrandOwner();
    const stranger = await createBrandOwner();
    const sizeOption = await createSizeOption();
    const categorySlug = await createCategory();
    const strangersAsset = await createImageAsset(stranger.id);

    const response = await request(testApp)
      .post("/api/products")
      .set("Authorization", authHeaderFor(owner.id))
      .send({
        ...buildProductBody(sizeOption.id, categorySlug),
        imageUrls: ["https://cdn.outfiqe.test/front.jpg"],
        imageAssetIds: [strangersAsset.id],
      });

    expect(response.status).toBe(404);
  });
});
