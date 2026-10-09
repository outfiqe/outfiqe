import { randomUUID } from "node:crypto";

import { subDays } from "date-fns/subDays";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import {
  CreatorStatus,
  FollowTargetType,
  ImageProcessingPriorityTier,
  ImageProcessingQualityTier,
  ImageProcessingStatus,
  ProductStatus,
  TagReviewStatus,
  UserRole,
} from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { decodeCursor } from "#lib/pagination.utils.js";
import { truncateToHour } from "#lib/trend-scoring.utils.js";
import { FOR_YOU_MAX_PER_CREATOR } from "#modules/creator-looks/creator-look.constants.js";
import { creatorLookRepository } from "#modules/creator-looks/creator-look.repository.js";
import { creatorLookService } from "#modules/creator-looks/creator-look.service.js";
import type { TrendingSnapshotCursor } from "#modules/creator-looks/creator-look.utils.js";
import {
  PLATFORM_PERMISSION_CATALOG,
  PLATFORM_PERMISSION_KEYS,
} from "#modules/platform-access/platform-access.constants.js";
import { PLATFORM_AUDIT_ACTION } from "#modules/platform-audit/platform-audit.constants.js";
import { platformSettingsService } from "#modules/platform-settings/platform-settings.service.js";
import { redis } from "#redis/redis.client.js";
import { redisKeys } from "#redis/redis.keys.js";
import { seedPlatformOrganization } from "#test/integration/crm-fixtures.js";
import { overrideOutfitSetting } from "#test/integration/outfit-fixtures.js";
import { ensureProductType } from "#test/integration/product-fixtures.js";
import { testApp } from "#test/integration/test-app.js";
import { uniquePhone } from "#test/integration/unique-values.js";

const OLDER_DROP_AGE_DAYS = 30;
const PROLIFIC_OLDER_DROP_COUNT = 5;

beforeEach(async () => {
  await redis.flushdb();
  platformSettingsService.invalidate();
});

const createCreator = async (name: string, handle: string) =>
  prisma.user.create({
    data: {
      email: `${handle}-${randomUUID()}@outfiqe.test`,
      name,
      handle: `${handle}-${randomUUID().slice(0, 6)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      isCreator: true,
      creatorStatus: CreatorStatus.APPROVED,
    },
  });

const createPlainUser = async (name: string, handle: string) =>
  prisma.user.create({
    data: {
      email: `${handle}-${randomUUID()}@outfiqe.test`,
      name,
      handle: `${handle}-${randomUUID().slice(0, 6)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
    },
  });

const createUserWithRole = async (
  name: string,
  handle: string,
  role: UserRole,
  overrides: { isCreator?: boolean; creatorStatus?: CreatorStatus } = {},
) =>
  prisma.user.create({
    data: {
      email: `${handle}-${randomUUID()}@outfiqe.test`,
      name,
      handle: `${handle}-${randomUUID().slice(0, 6)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role,
      ...overrides,
    },
  });

const seedPlatformAdminRole = async () => {
  const { organization, adminRole } = await seedPlatformOrganization();
  await prisma.permission.createMany({
    data: PLATFORM_PERMISSION_CATALOG.map((permission) => ({ ...permission })),
    skipDuplicates: true,
  });
  await prisma.rolePermission.createMany({
    data: PLATFORM_PERMISSION_KEYS.map((permissionKey) => ({
      roleId: adminRole.id,
      permissionKey,
    })),
    skipDuplicates: true,
  });
  return { organization, adminRole };
};

const createContentModerator = async (name: string, handle: string) => {
  const { organization, adminRole } = await seedPlatformAdminRole();
  const moderator = await createUserWithRole(name, handle, UserRole.ADMIN);
  await prisma.membership.create({
    data: {
      organizationId: organization.id,
      userId: moderator.id,
      roleId: adminRole.id,
      status: "ACTIVE",
    },
  });
  return moderator;
};

const createLook = async (creatorId: string, caption: string) =>
  prisma.creatorLook.create({
    data: {
      creatorId,
      imageUrl: `https://cdn.outfiqe.test/${randomUUID()}.jpg`,
      caption,
    },
  });

const createBrand = async (name: string) =>
  prisma.brand.create({
    data: {
      name,
      contactName: "Brand Contact",
      email: `${randomUUID()}@brand.outfiqe.test`,
      phone: uniquePhone(),
      instagram: `@${randomUUID().slice(0, 8)}`,
    },
  });

const createApprovedProduct = async (name: string, price = 1000) => {
  const brand = await createBrand(`${name} Brand`);
  return prisma.product.create({
    data: {
      brandId: brand.id,
      name,
      price,
      productTypeId: await ensureProductType(),
      status: ProductStatus.APPROVED,
      imageUrl: `https://cdn.outfiqe.test/${randomUUID()}.jpg`,
    },
  });
};

const createPendingProduct = async (name: string, price = 1000) => {
  const brand = await createBrand(`${name} Brand`);
  return prisma.product.create({
    data: {
      brandId: brand.id,
      name,
      price,
      productTypeId: await ensureProductType(),
      status: ProductStatus.PENDING,
      imageUrl: `https://cdn.outfiqe.test/${randomUUID()}.jpg`,
    },
  });
};

const createImageAsset = async (ownerId: string) =>
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

const tagProduct = async (lookId: string, productId: string, sizeWorn = "M") =>
  prisma.creatorLookProduct.create({
    data: { creatorLookId: lookId, productId, sizeWorn, reviewStatus: TagReviewStatus.APPROVED },
  });

const followCreator = async (followerId: string, creatorId: string) =>
  prisma.follow.create({
    data: { followerId, followingType: FollowTargetType.USER, followingId: creatorId },
  });

const authHeaderFor = (userId: string, role: UserRole = UserRole.CUSTOMER) => {
  const { accessToken } = generateTokenpair({ sub: userId, role });
  return `Bearer ${accessToken}`;
};

describe("GET /api/creator-looks/autocomplete", () => {
  it("returns drops matching the caption, hydrated with muse info", async () => {
    const creator = await createCreator("Priya Shah", "priya-shah");
    await createLook(creator.id, "Winter layers done right");

    const response = await request(testApp)
      .get("/api/creator-looks/autocomplete")
      .query({ q: "winter layers" });

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeGreaterThan(0);
    expect(response.body.data[0]).toMatchObject({
      caption: "Winter layers done right",
      creator: { name: "Priya Shah" },
    });
    expect(response.body.data[0]).toHaveProperty("id");
    expect(response.body.data[0]).toHaveProperty("imageUrl");
    expect(response.body.data[0].creator).toHaveProperty("handle");
  });

  it("serves a repeated query from the in-process memory cache", async () => {
    const creator = await createCreator("Repeat Query Muse", "repeat-query-creator");
    await createLook(creator.id, "Repeatable caption unique-marker-repeat");

    const first = await request(testApp)
      .get("/api/creator-looks/autocomplete")
      .query({ q: "unique-marker-repeat" });
    const second = await request(testApp)
      .get("/api/creator-looks/autocomplete")
      .query({ q: "unique-marker-repeat" });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body.data).toEqual(first.body.data);
  });

  it("matches by the drop's muse name, not just the caption", async () => {
    const creator = await createCreator("Sabin Shrestha", "sabin-shrestha");
    await createLook(creator.id, "Everyday street style");

    const response = await request(testApp)
      .get("/api/creator-looks/autocomplete")
      .query({ q: "Sabin Shrestha" });

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeGreaterThan(0);
    expect(response.body.data[0].creator).toMatchObject({ name: "Sabin Shrestha" });
  });

  it("works for an anonymous caller and never leaks viewer-only fields", async () => {
    const creator = await createCreator("Jordan Lee", "jordan-lee");
    await createLook(creator.id, "Studio session look");

    const response = await request(testApp)
      .get("/api/creator-looks/autocomplete")
      .query({ q: "Studio session" });

    expect(response.status).toBe(200);
    expect(response.body.data[0]).not.toHaveProperty("isLiked");
    expect(response.body.data[0]).not.toHaveProperty("isSaved");
    expect(response.body.data[0]).not.toHaveProperty("isFollowingCreator");
  });

  it("returns an empty list for no match instead of erroring", async () => {
    const response = await request(testApp)
      .get("/api/creator-looks/autocomplete")
      .query({ q: "zzznonexistentcaptionzzz" });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
  });

  it("rejects an empty query", async () => {
    const response = await request(testApp).get("/api/creator-looks/autocomplete").query({ q: "" });

    expect(response.status).toBe(422);
  });
});

describe("POST /api/creator-looks", () => {
  it("creates a look with tagged products and extracted hashtags", async () => {
    const creator = await createCreator("Drop Muse", "post-creator");
    const product = await createApprovedProduct("Denim Jacket");

    const response = await request(testApp)
      .post("/api/creator-looks")
      .set("Authorization", authHeaderFor(creator.id))
      .send({
        imageUrls: ["https://cdn.outfiqe.test/a.jpg", "https://cdn.outfiqe.test/b.jpg"],
        caption: "Loving this #winter #layering fit",
        taggedProducts: [{ productId: product.id, sizeWorn: "M" }],
      });

    expect(response.status).toBe(201);
    expect(response.body.data.taggedProducts).toHaveLength(1);
    expect(response.body.data.imageUrl).toBe("https://cdn.outfiqe.test/a.jpg");

    const hashtags = await prisma.creatorLookHashtag.findMany({
      where: { creatorLookId: response.body.data.id },
    });
    expect(hashtags.map((row) => row.tag).sort()).toEqual(["layering", "winter"]);

    const ownDetail = await request(testApp)
      .get(`/api/creator-looks/${response.body.data.id}`)
      .set("Authorization", authHeaderFor(creator.id));
    expect(ownDetail.body.data.imageUrls).toEqual([
      "https://cdn.outfiqe.test/a.jpg",
      "https://cdn.outfiqe.test/b.jpg",
    ]);

    const searchResponse = await request(testApp)
      .get("/api/creator-looks/search")
      .query({ q: "Loving this" });
    expect(searchResponse.body.data.posts[0].images).toEqual([
      "https://cdn.outfiqe.test/a.jpg",
      "https://cdn.outfiqe.test/b.jpg",
    ]);
  });

  it("creates a look without a caption", async () => {
    const creator = await createCreator("Captionless Muse", "captionless-creator");

    const response = await request(testApp)
      .post("/api/creator-looks")
      .set("Authorization", authHeaderFor(creator.id))
      .send({ imageUrls: ["https://cdn.outfiqe.test/no-caption.jpg"], taggedProducts: [] });

    expect(response.status).toBe(201);
    expect(response.body.data.caption).toBeNull();

    const hashtags = await prisma.creatorLookHashtag.findMany({
      where: { creatorLookId: response.body.data.id },
    });
    expect(hashtags).toEqual([]);
  });

  it("defaults to a PORTRAIT layout when none is chosen", async () => {
    const creator = await createCreator("Default Layout Muse", "default-layout-creator");

    const response = await request(testApp)
      .post("/api/creator-looks")
      .set("Authorization", authHeaderFor(creator.id))
      .send({ imageUrls: ["https://cdn.outfiqe.test/default-layout.jpg"], taggedProducts: [] });

    expect(response.status).toBe(201);
    expect(response.body.data.layout).toBe("PORTRAIT");
  });

  it.each(["PORTRAIT", "SQUARE", "TALL"])(
    "persists and returns a %s layout chosen at creation",
    async (layout) => {
      const creator = await createCreator(`Layout Muse ${layout}`, `layout-creator-${layout}`);

      const response = await request(testApp)
        .post("/api/creator-looks")
        .set("Authorization", authHeaderFor(creator.id))
        .send({
          imageUrls: [`https://cdn.outfiqe.test/${layout}.jpg`],
          taggedProducts: [],
          layout,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.layout).toBe(layout);

      const stored = await prisma.creatorLook.findUniqueOrThrow({
        where: { id: response.body.data.id },
      });
      expect(stored.layout).toBe(layout);
    },
  );

  it("rejects a layout value outside the closed set", async () => {
    const creator = await createCreator("Invalid Layout Muse", "invalid-layout-creator");

    const response = await request(testApp)
      .post("/api/creator-looks")
      .set("Authorization", authHeaderFor(creator.id))
      .send({
        imageUrls: ["https://cdn.outfiqe.test/invalid-layout.jpg"],
        taggedProducts: [],
        layout: "LANDSCAPE",
      });

    expect(response.status).toBe(422);
  });

  it("links the caller's uploaded image assets to the look's images by position", async () => {
    const creator = await createCreator("Asset Link Muse", "asset-link-creator");
    const asset = await createImageAsset(creator.id);

    const response = await request(testApp)
      .post("/api/creator-looks")
      .set("Authorization", authHeaderFor(creator.id))
      .send({
        imageUrls: ["https://cdn.outfiqe.test/cover.jpg", "https://cdn.outfiqe.test/second.jpg"],
        imageAssetIds: [asset.id, null],
        taggedProducts: [],
      });

    expect(response.status).toBe(201);
    const images = await prisma.creatorLookImage.findMany({
      where: { creatorLookId: response.body.data.id },
      orderBy: { sortOrder: "asc" },
    });
    expect(images.map((image) => image.imageAssetId)).toEqual([asset.id, null]);
  });

  it("rejects image assets owned by another user", async () => {
    const creator = await createCreator("Asset Owner Muse", "asset-owner-creator");
    const stranger = await createPlainUser("Stranger", "asset-stranger");
    const strangersAsset = await createImageAsset(stranger.id);

    const response = await request(testApp)
      .post("/api/creator-looks")
      .set("Authorization", authHeaderFor(creator.id))
      .send({
        imageUrls: ["https://cdn.outfiqe.test/cover.jpg"],
        imageAssetIds: [strangersAsset.id],
        taggedProducts: [],
      });

    expect(response.status).toBe(404);
  });

  it("rejects an imageAssetIds list that does not line up with imageUrls", async () => {
    const creator = await createCreator("Asset Mismatch Muse", "asset-mismatch-creator");

    const response = await request(testApp)
      .post("/api/creator-looks")
      .set("Authorization", authHeaderFor(creator.id))
      .send({
        imageUrls: ["https://cdn.outfiqe.test/cover.jpg", "https://cdn.outfiqe.test/second.jpg"],
        imageAssetIds: [randomUUID()],
        taggedProducts: [],
      });

    expect(response.status).toBe(422);
  });

  it("rejects a non-approved muse", async () => {
    const plainUser = await createPlainUser("Not A Muse", "post-not-a-creator");

    const response = await request(testApp)
      .post("/api/creator-looks")
      .set("Authorization", authHeaderFor(plainUser.id))
      .send({
        imageUrls: ["https://cdn.outfiqe.test/a.jpg"],
        taggedProducts: [],
      });

    expect(response.status).toBe(403);
  });

  it("rejects a platform admin even if their row is already flagged as an approved muse", async () => {
    const corruptedAdmin = await createUserWithRole(
      "Corrupted Admin Muse",
      "corrupted-admin-creator",
      UserRole.ADMIN,
      { isCreator: true, creatorStatus: CreatorStatus.APPROVED },
    );

    const response = await request(testApp)
      .post("/api/creator-looks")
      .set("Authorization", authHeaderFor(corruptedAdmin.id, UserRole.ADMIN))
      .send({
        imageUrls: ["https://cdn.outfiqe.test/staff-post.jpg"],
        taggedProducts: [],
      });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("STAFF_CANNOT_BE_CREATOR");
  });

  it("rejects tagging a product that isn't approved", async () => {
    const creator = await createCreator("Rejected Tag Muse", "rejected-tag-creator");
    const pendingProduct = await createPendingProduct("Unapproved Hoodie");

    const response = await request(testApp)
      .post("/api/creator-looks")
      .set("Authorization", authHeaderFor(creator.id))
      .send({
        imageUrls: ["https://cdn.outfiqe.test/a.jpg"],
        taggedProducts: [{ productId: pendingProduct.id, sizeWorn: "M" }],
      });

    expect(response.status).toBe(404);
  });

  it("rejects tagging a product that doesn't exist", async () => {
    const creator = await createCreator("Nonexistent Tag Muse", "nonexistent-tag-creator");

    const response = await request(testApp)
      .post("/api/creator-looks")
      .set("Authorization", authHeaderFor(creator.id))
      .send({
        imageUrls: ["https://cdn.outfiqe.test/a.jpg"],
        taggedProducts: [{ productId: randomUUID(), sizeWorn: "M" }],
      });

    expect(response.status).toBe(404);
  });

  it("requires authentication", async () => {
    const response = await request(testApp)
      .post("/api/creator-looks")
      .send({ imageUrls: ["https://cdn.outfiqe.test/a.jpg"], taggedProducts: [] });

    expect(response.status).toBe(401);
  });

  it("allows as many tagged products as a build can hold, and no more", async () => {
    const creator = await createCreator("Tag Limit Creator", "tag-limit-creator");
    const products = await Promise.all(
      ["Kurta", "Trousers", "Juttis"].map((name) => createApprovedProduct(name)),
    );
    const postWith = (taggedProductCount: number) =>
      request(testApp)
        .post("/api/creator-looks")
        .set("Authorization", authHeaderFor(creator.id))
        .send({
          imageUrls: ["https://cdn.outfiqe.test/a.jpg"],
          taggedProducts: products
            .slice(0, taggedProductCount)
            .map((product) => ({ productId: product.id, sizeWorn: "M" })),
        });
    await overrideOutfitSetting("outfit.maxItemsPerBoard", 2);

    const overLimit = await postWith(3);
    const atLimit = await postWith(2);
    const limits = await request(testApp).get("/api/creator-looks/limits");

    expect(overLimit.status).toBe(422);
    expect(overLimit.body.code).toBe("TOO_MANY_TAGGED_PRODUCTS");
    expect(atLimit.status).toBe(201);
    expect(limits.body.data).toEqual({ maxTaggedProducts: 2 });
  });

  it("rejects an empty imageUrls array", async () => {
    const creator = await createCreator("Empty Images Muse", "empty-images-creator");

    const response = await request(testApp)
      .post("/api/creator-looks")
      .set("Authorization", authHeaderFor(creator.id))
      .send({ imageUrls: [], taggedProducts: [] });

    expect(response.status).toBe(422);
  });
});

describe("GET /api/creator-looks/:lookId", () => {
  it("returns the owner's own drop detail", async () => {
    const creator = await createCreator("Owner Getter", "owner-getter");
    const product = await createApprovedProduct("Getter Boots");
    const look = await createLook(creator.id, "My own drop");
    await tagProduct(look.id, product.id);

    const response = await request(testApp)
      .get(`/api/creator-looks/${look.id}`)
      .set("Authorization", authHeaderFor(creator.id));

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(look.id);
    expect(response.body.data.taggedProducts).toHaveLength(1);
    expect(response.body.data.taggedProducts[0]).toMatchObject({
      reviewStatus: "APPROVED",
      rejectionReason: null,
      rejectionNote: null,
      canReRequest: false,
    });
  });

  it("surfaces a rejected tag's reason, note, and remaining re-request budget to the owner", async () => {
    const creator = await createCreator("Rejected Tag Owner", "rejected-tag-owner");
    const product = await createApprovedProduct("Contested Coat");
    const look = await createLook(creator.id, "Still up, tag under review");
    await prisma.creatorLookProduct.create({
      data: {
        creatorLookId: look.id,
        productId: product.id,
        sizeWorn: "M",
        reviewStatus: TagReviewStatus.REJECTED,
        rejectionReason: "MISREPRESENTS_PRODUCT",
        rejectionNote: "This isn't a current-season colourway.",
        reRequestCount: 3,
      },
    });

    const response = await request(testApp)
      .get(`/api/creator-looks/${look.id}`)
      .set("Authorization", authHeaderFor(creator.id));

    expect(response.status).toBe(200);
    expect(response.body.data.taggedProducts[0]).toMatchObject({
      reviewStatus: "REJECTED",
      rejectionReason: "MISREPRESENTS_PRODUCT",
      rejectionNote: "This isn't a current-season colourway.",
      canReRequest: false,
    });
  });

  it("returns 404 for a drop owned by someone else", async () => {
    const owner = await createCreator("Real Owner", "real-owner");
    const outsider = await createCreator("Outsider Viewer", "outsider-viewer");
    const look = await createLook(owner.id, "Not yours");

    const response = await request(testApp)
      .get(`/api/creator-looks/${look.id}`)
      .set("Authorization", authHeaderFor(outsider.id));

    expect(response.status).toBe(404);
  });

  it("returns 404 for a nonexistent drop", async () => {
    const creator = await createCreator("Missing Drop Viewer", "missing-post-viewer");

    const response = await request(testApp)
      .get(`/api/creator-looks/${randomUUID()}`)
      .set("Authorization", authHeaderFor(creator.id));

    expect(response.status).toBe(404);
  });

  it("requires authentication", async () => {
    const creator = await createCreator("Auth Required Owner", "auth-required-owner");
    const look = await createLook(creator.id, "Needs auth");

    const response = await request(testApp).get(`/api/creator-looks/${look.id}`);

    expect(response.status).toBe(401);
  });
});

describe("GET /api/creator-looks/:lookId/public", () => {
  it("returns a drop for any viewer, not just the owner", async () => {
    const creator = await createCreator("Public Getter", "public-getter");
    const viewer = await createCreator("Public Viewer", "public-viewer");
    const look = await createLook(creator.id, "Anyone can see this");

    const response = await request(testApp)
      .get(`/api/creator-looks/${look.id}/public`)
      .set("Authorization", authHeaderFor(viewer.id));

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(look.id);
    expect(response.body.data.creator.id).toBe(creator.id);
  });

  it("works for an unauthenticated viewer too", async () => {
    const creator = await createCreator("Anon Getter", "anon-getter");
    const look = await createLook(creator.id, "Public even signed out");

    const response = await request(testApp).get(`/api/creator-looks/${look.id}/public`);

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(look.id);
  });

  it("reflects the viewer's own like state", async () => {
    const creator = await createCreator("Liked Getter", "liked-getter");
    const liker = await createCreator("Liker Viewer", "liker-viewer");
    const look = await createLook(creator.id, "Liked drop");

    await request(testApp)
      .post(`/api/creator-looks/${look.id}/like`)
      .set("Authorization", authHeaderFor(liker.id));

    const response = await request(testApp)
      .get(`/api/creator-looks/${look.id}/public`)
      .set("Authorization", authHeaderFor(liker.id));

    expect(response.status).toBe(200);
    expect(response.body.data.isLiked).toBe(true);
  });

  it("returns 404 for a nonexistent drop", async () => {
    const response = await request(testApp).get(`/api/creator-looks/${randomUUID()}/public`);

    expect(response.status).toBe(404);
  });
});

describe("PATCH /api/creator-looks/:lookId", () => {
  it("updates a drop's images, caption, and tagged products", async () => {
    const creator = await createCreator("Update Muse", "update-creator");
    const originalProduct = await createApprovedProduct("Original Scarf");
    const newProduct = await createApprovedProduct("New Scarf");
    const look = await createLook(creator.id, "Before edit");
    await tagProduct(look.id, originalProduct.id);

    const response = await request(testApp)
      .patch(`/api/creator-looks/${look.id}`)
      .set("Authorization", authHeaderFor(creator.id))
      .send({
        imageUrls: ["https://cdn.outfiqe.test/updated.jpg"],
        caption: "After edit #refresh",
        taggedProducts: [{ productId: newProduct.id, sizeWorn: "L" }],
      });

    expect(response.status).toBe(200);
    expect(response.body.data.imageUrl).toBe("https://cdn.outfiqe.test/updated.jpg");
    expect(response.body.data.taggedProducts.map((p: { id: string }) => p.id)).toEqual([
      newProduct.id,
    ]);

    const hashtags = await prisma.creatorLookHashtag.findMany({
      where: { creatorLookId: look.id },
    });
    expect(hashtags.map((row) => row.tag)).toEqual(["refresh"]);
  });

  it("clears the derived hashtags when the caption is omitted from the update", async () => {
    const creator = await createCreator("Caption Clear Muse", "caption-clear-creator");
    const look = await createLook(creator.id, "Had a caption #before");
    await prisma.creatorLookHashtag.create({ data: { creatorLookId: look.id, tag: "before" } });

    const response = await request(testApp)
      .patch(`/api/creator-looks/${look.id}`)
      .set("Authorization", authHeaderFor(creator.id))
      .send({ imageUrls: ["https://cdn.outfiqe.test/no-caption.jpg"], taggedProducts: [] });

    expect(response.status).toBe(200);

    const hashtags = await prisma.creatorLookHashtag.findMany({
      where: { creatorLookId: look.id },
    });
    expect(hashtags).toEqual([]);
  });

  it("returns 404 for a drop owned by someone else", async () => {
    const owner = await createCreator("Update Real Owner", "update-real-owner");
    const outsider = await createCreator("Update Outsider", "update-outsider");
    const look = await createLook(owner.id, "Protected");

    const response = await request(testApp)
      .patch(`/api/creator-looks/${look.id}`)
      .set("Authorization", authHeaderFor(outsider.id))
      .send({ imageUrls: ["https://cdn.outfiqe.test/x.jpg"], taggedProducts: [] });

    expect(response.status).toBe(404);
  });

  it("rejects tagging a product that isn't approved", async () => {
    const creator = await createCreator("Update Reject Muse", "update-reject-creator");
    const pendingProduct = await createPendingProduct("Still Pending");
    const look = await createLook(creator.id, "Editable");

    const response = await request(testApp)
      .patch(`/api/creator-looks/${look.id}`)
      .set("Authorization", authHeaderFor(creator.id))
      .send({
        imageUrls: ["https://cdn.outfiqe.test/x.jpg"],
        taggedProducts: [{ productId: pendingProduct.id, sizeWorn: "M" }],
      });

    expect(response.status).toBe(404);
  });

  it("requires authentication", async () => {
    const response = await request(testApp)
      .patch(`/api/creator-looks/${randomUUID()}`)
      .send({ imageUrls: ["https://cdn.outfiqe.test/x.jpg"], taggedProducts: [] });

    expect(response.status).toBe(401);
  });
});

describe("DELETE /api/creator-looks/:lookId", () => {
  it("soft-deletes the owner's drop", async () => {
    const creator = await createCreator("Delete Muse", "delete-creator");
    const look = await createLook(creator.id, "Going away");

    const response = await request(testApp)
      .delete(`/api/creator-looks/${look.id}`)
      .set("Authorization", authHeaderFor(creator.id));

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ deleted: true });

    const stored = await prisma.creatorLook.findUniqueOrThrow({ where: { id: look.id } });
    expect(stored.deletedAt).not.toBeNull();

    const afterDelete = await request(testApp)
      .get(`/api/creator-looks/${look.id}`)
      .set("Authorization", authHeaderFor(creator.id));
    expect(afterDelete.status).toBe(404);
  });

  it("returns 404 for a drop owned by someone else", async () => {
    const owner = await createCreator("Delete Real Owner", "delete-real-owner");
    const outsider = await createCreator("Delete Outsider", "delete-outsider");
    const look = await createLook(owner.id, "Protected from deletion");

    const response = await request(testApp)
      .delete(`/api/creator-looks/${look.id}`)
      .set("Authorization", authHeaderFor(outsider.id));

    expect(response.status).toBe(404);
  });

  it("returns 404 for a platform admin with no content-moderate permission", async () => {
    const owner = await createCreator("Unmoderated Owner", "unmoderated-owner");
    const bareAdmin = await createUserWithRole("Bare Admin", "bare-admin", UserRole.ADMIN);
    const look = await createLook(owner.id, "Still protected from a bare admin");

    const response = await request(testApp)
      .delete(`/api/creator-looks/${look.id}`)
      .set("Authorization", authHeaderFor(bareAdmin.id, UserRole.ADMIN));

    expect(response.status).toBe(404);
  });

  it("lets a platform moderator delete another muse's drop and logs it", async () => {
    const owner = await createCreator("Moderated Owner", "moderated-owner");
    const moderator = await createContentModerator("Content Moderator", "content-moderator-look");
    const look = await createLook(owner.id, "About to be removed by staff");

    const response = await request(testApp)
      .delete(`/api/creator-looks/${look.id}`)
      .set("Authorization", authHeaderFor(moderator.id, UserRole.ADMIN));

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ deleted: true });

    const stored = await prisma.creatorLook.findUniqueOrThrow({ where: { id: look.id } });
    expect(stored.deletedAt).not.toBeNull();

    const auditLog = await prisma.platformAuditLog.findFirst({
      where: { targetType: "CreatorLook", targetId: look.id },
    });
    expect(auditLog).toMatchObject({
      actorUserId: moderator.id,
      onBehalfOfUserId: owner.id,
      action: PLATFORM_AUDIT_ACTION.CREATOR_LOOK_REMOVED_BY_ADMIN,
    });
  });

  it("requires authentication", async () => {
    const response = await request(testApp).delete(`/api/creator-looks/${randomUUID()}`);

    expect(response.status).toBe(401);
  });
});

describe("GET /api/creator-looks/saved", () => {
  it("lists the caller's saved looks, most recently saved first, with cursor pagination", async () => {
    const creator = await createCreator("Saved List Muse", "saved-list-creator");
    const viewer = await createCreator("Saved List Viewer", "saved-list-viewer");
    const lookOne = await createLook(creator.id, "Save target one");
    const lookTwo = await createLook(creator.id, "Save target two");

    await request(testApp)
      .post(`/api/creator-looks/${lookOne.id}/save`)
      .set("Authorization", authHeaderFor(viewer.id));
    await request(testApp)
      .post(`/api/creator-looks/${lookTwo.id}/save`)
      .set("Authorization", authHeaderFor(viewer.id));

    const first = await request(testApp)
      .get("/api/creator-looks/saved")
      .query({ limit: 1 })
      .set("Authorization", authHeaderFor(viewer.id));

    expect(first.status).toBe(200);
    expect(first.body.data.posts).toHaveLength(1);
    expect(first.body.data.posts[0].id).toBe(lookTwo.id);
    expect(first.body.data.nextCursor).not.toBeNull();

    const second = await request(testApp)
      .get("/api/creator-looks/saved")
      .query({ limit: 1, cursor: first.body.data.nextCursor })
      .set("Authorization", authHeaderFor(viewer.id));

    expect(second.status).toBe(200);
    expect(second.body.data.posts[0].id).toBe(lookOne.id);
  });

  it("returns an empty page when nothing is saved", async () => {
    const viewer = await createCreator("Empty Saved Viewer", "empty-saved-viewer");

    const response = await request(testApp)
      .get("/api/creator-looks/saved")
      .set("Authorization", authHeaderFor(viewer.id));

    expect(response.status).toBe(200);
    expect(response.body.data.posts).toEqual([]);
    expect(response.body.data.nextCursor).toBeNull();
  });

  it("requires authentication", async () => {
    const response = await request(testApp).get("/api/creator-looks/saved");

    expect(response.status).toBe(401);
  });
});

describe("GET /api/creator-looks (listFeatured)", () => {
  it("returns looks with approved tagged products, ranked by engagement", async () => {
    const creator = await createCreator("Featured Muse", "featured-creator");
    const product = await createApprovedProduct("Featured Blazer");
    const look = await createLook(creator.id, "Featured drop");
    await tagProduct(look.id, product.id);

    const response = await request(testApp).get("/api/creator-looks");

    expect(response.status).toBe(200);
    expect(response.body.data.posts.some((post: { id: string }) => post.id === look.id)).toBe(true);
  });

  it("returns an empty page when nothing has a tagged, approved product", async () => {
    const response = await request(testApp)
      .get("/api/creator-looks")
      .query({ limit: 1, cursor: undefined });

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty("posts");
    expect(response.body.data).toHaveProperty("nextCursor");
  });

  it("paginates using nextCursor", async () => {
    const creator = await createCreator("Featured Page Muse", "featured-page-creator");
    const viewer = await createCreator("Featured Page Viewer", "featured-page-viewer");
    const productOne = await createApprovedProduct("Featured Page Product One");
    const productTwo = await createApprovedProduct("Featured Page Product Two");
    const lookOne = await createLook(creator.id, "Featured page drop one");
    const lookTwo = await createLook(creator.id, "Featured page drop two");
    await tagProduct(lookOne.id, productOne.id);
    await tagProduct(lookTwo.id, productTwo.id);
    await request(testApp)
      .post(`/api/creator-looks/${lookOne.id}/like`)
      .set("Authorization", authHeaderFor(viewer.id));

    const first = await request(testApp).get("/api/creator-looks").query({ limit: 1 });

    expect(first.status).toBe(200);
    expect(first.body.data.posts).toHaveLength(1);
    expect(first.body.data.posts[0].id).toBe(lookOne.id);
    expect(first.body.data.nextCursor).not.toBeNull();

    const second = await request(testApp)
      .get("/api/creator-looks")
      .query({ limit: 1, cursor: first.body.data.nextCursor });

    expect(second.status).toBe(200);
    expect(second.body.data.posts[0].id).toBe(lookTwo.id);
  });
});

describe("GET /api/creator-looks/search", () => {
  it("returns matching drops with a total count", async () => {
    const creator = await createCreator("Search Drop Muse", "search-post-creator");
    await createLook(creator.id, "Searchable caption unique-marker-one");

    const response = await request(testApp)
      .get("/api/creator-looks/search")
      .query({ q: "unique-marker-one" });

    expect(response.status).toBe(200);
    expect(response.body.data.posts.length).toBeGreaterThan(0);
    expect(response.body.data).toHaveProperty("total");
  });

  it("returns an empty page with a null cursor and zero total for no match", async () => {
    const response = await request(testApp)
      .get("/api/creator-looks/search")
      .query({ q: "zzznonexistentsearchmarkerzzz" });

    expect(response.status).toBe(200);
    expect(response.body.data.posts).toEqual([]);
    expect(response.body.data.total).toBe(0);
    expect(response.body.data.nextCursor).toBeNull();
  });

  it("reflects the viewer's like state when authenticated", async () => {
    const creator = await createCreator("Search Like Muse", "search-like-creator");
    const viewer = await createCreator("Search Like Viewer", "search-like-viewer");
    const look = await createLook(creator.id, "Searchable caption unique-marker-two");

    await request(testApp)
      .post(`/api/creator-looks/${look.id}/like`)
      .set("Authorization", authHeaderFor(viewer.id));

    const response = await request(testApp)
      .get("/api/creator-looks/search")
      .query({ q: "unique-marker-two" })
      .set("Authorization", authHeaderFor(viewer.id));

    expect(response.status).toBe(200);
    expect(response.body.data.posts[0].isLiked).toBe(true);
  });

  it("paginates using nextCursor", async () => {
    const creator = await createCreator("Search Page Muse", "search-page-creator");
    const marker = randomUUID().slice(0, 8);
    await createLook(creator.id, `Marker ${marker} entry one`);
    await createLook(creator.id, `Marker ${marker} entry two`);

    const first = await request(testApp)
      .get("/api/creator-looks/search")
      .query({ q: `Marker ${marker}`, limit: 1 });

    expect(first.status).toBe(200);
    expect(first.body.data.posts).toHaveLength(1);
    expect(first.body.data.nextCursor).not.toBeNull();

    const second = await request(testApp)
      .get("/api/creator-looks/search")
      .query({ q: `Marker ${marker}`, limit: 1, cursor: first.body.data.nextCursor });

    expect(second.status).toBe(200);
    expect(second.body.data.posts).toHaveLength(1);
    expect(second.body.data.posts[0].id).not.toBe(first.body.data.posts[0].id);
  });

  it("rejects an empty query", async () => {
    const response = await request(testApp).get("/api/creator-looks/search").query({ q: "" });

    expect(response.status).toBe(422);
  });
});

describe("GET /api/creator-looks/tags/trending", () => {
  it("falls back to the legacy hashtag aggregate when no trend metrics exist yet", async () => {
    const creator = await createCreator("Trending Tag Muse", "trending-tag-creator");
    const marker = randomUUID().slice(0, 6);
    const look = await createLook(creator.id, `Drop about #trendtag${marker}`);
    await prisma.creatorLookHashtag.create({
      data: { creatorLookId: look.id, tag: `trendtag${marker}` },
    });

    const response = await request(testApp).get("/api/creator-looks/tags/trending");

    expect(response.status).toBe(200);
    expect(response.body.data.tags).toEqual(
      expect.arrayContaining([expect.objectContaining({ tag: `trendtag${marker}`, postCount: 1 })]),
    );

    const cachedResponse = await request(testApp).get("/api/creator-looks/tags/trending");
    expect(cachedResponse.status).toBe(200);
    expect(cachedResponse.body.data.tags).toEqual(response.body.data.tags);
  });

  it("uses the ranked score once the trend-tag pipeline has run", async () => {
    const creator = await createCreator("Ranked Tag Muse", "ranked-tag-creator");
    const marker = randomUUID().slice(0, 6);
    const look = await createLook(creator.id, `Ranked pipeline drop #rankedtag${marker}`);
    await prisma.creatorLookHashtag.create({
      data: { creatorLookId: look.id, tag: `rankedtag${marker}` },
    });

    await creatorLookService.runTagTrendingAggregation();
    const { ranked } = await creatorLookService.runTagTrendingScoring();
    expect(ranked.length).toBeGreaterThan(0);

    const response = await request(testApp).get("/api/creator-looks/tags/trending");

    expect(response.status).toBe(200);
    expect(response.body.data.tags.length).toBeGreaterThan(0);
  });
});

describe("creatorLookService tag trending pipeline", () => {
  it("caches an empty scoring result with a short TTL instead of the normal long-lived one", async () => {
    const { ranked } = await creatorLookService.runTagTrendingScoring();
    expect(ranked).toHaveLength(0);

    const ttl = await redis.ttl(redisKeys.cache("explore-tag-trend-score", "global"));
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(90);
  });

  it("caches a non-empty scoring result with the normal long-lived TTL", async () => {
    const creator = await createCreator("Tag TTL Muse", "tag-ttl-creator");
    const marker = randomUUID().slice(0, 6);
    const look = await createLook(creator.id, `Tag TTL drop #tagttl${marker}`);
    await prisma.creatorLookHashtag.create({
      data: { creatorLookId: look.id, tag: `tagttl${marker}` },
    });
    await creatorLookService.runTagTrendingAggregation();

    const { ranked } = await creatorLookService.runTagTrendingScoring();
    expect(ranked.length).toBeGreaterThan(0);

    const ttl = await redis.ttl(redisKeys.cache("explore-tag-trend-score", "global"));
    expect(ttl).toBeGreaterThan(90);
  });

  it("excludes hashtags from deleted muse looks when aggregating tag metrics", async () => {
    const creator = await createCreator("Tag Deleted Muse", "tag-deleted-creator");
    const marker = randomUUID().slice(0, 6);
    const tag = `deletedtag${marker}`;
    const look = await createLook(creator.id, `Deleted drop #${tag}`);
    await prisma.creatorLookHashtag.create({ data: { creatorLookId: look.id, tag } });
    await prisma.creatorLook.update({ where: { id: look.id }, data: { deletedAt: new Date() } });

    await creatorLookService.runTagTrendingAggregation();
    const { ranked } = await creatorLookService.runTagTrendingScoring();

    expect(ranked.some((entry) => entry.tag === tag)).toBe(false);
  });

  it("weighs recent tag activity more heavily than old activity from the same tag", async () => {
    const markerOld = randomUUID().slice(0, 6);
    const markerRecent = randomUUID().slice(0, 6);
    const oldTag = `oldtag${markerOld}`;
    const recentTag = `recenttag${markerRecent}`;

    const oldBucketStart = truncateToHour(new Date(Date.now() - 13 * 24 * 60 * 60 * 1000));
    await prisma.hashtagTrendMetric.create({
      data: { tag: oldTag, bucketStart: oldBucketStart, postCount: 20 },
    });

    const recentBucketStart = truncateToHour(new Date());
    await prisma.hashtagTrendMetric.create({
      data: { tag: recentTag, bucketStart: recentBucketStart, postCount: 2 },
    });

    const { ranked } = await creatorLookService.runTagTrendingScoring();

    const oldIndex = ranked.findIndex((entry) => entry.tag === oldTag);
    const recentIndex = ranked.findIndex((entry) => entry.tag === recentTag);

    expect(oldIndex).toBe(-1);
    expect(recentIndex).toBeGreaterThanOrEqual(0);
  });

  it("breaks a tie between equally-scored tags the same way on every recompute", async () => {
    const creatorOne = await createCreator("Tag Tie Muse One", "tag-tie-creator-one");
    const creatorTwo = await createCreator("Tag Tie Muse Two", "tag-tie-creator-two");
    const markerA = randomUUID().slice(0, 6);
    const markerB = randomUUID().slice(0, 6);
    const tagA = `tietaga${markerA}`;
    const tagB = `tietagb${markerB}`;

    const lookA = await createLook(creatorOne.id, `Tie drop A #${tagA}`);
    await prisma.creatorLookHashtag.create({ data: { creatorLookId: lookA.id, tag: tagA } });
    const lookB = await createLook(creatorTwo.id, `Tie drop B #${tagB}`);
    await prisma.creatorLookHashtag.create({ data: { creatorLookId: lookB.id, tag: tagB } });
    await creatorLookService.runTagTrendingAggregation();

    const firstRun = await creatorLookService.runTagTrendingScoring();
    const secondRun = await creatorLookService.runTagTrendingScoring();

    const rankOf = (ranked: typeof firstRun.ranked, tag: string) =>
      ranked.findIndex((entry) => entry.tag === tag);

    const firstScoreA = firstRun.ranked[rankOf(firstRun.ranked, tagA)]?.score;
    const firstScoreB = firstRun.ranked[rankOf(firstRun.ranked, tagB)]?.score;
    expect(firstScoreA).toBe(firstScoreB);

    const expectedOrder = tagA.localeCompare(tagB) <= 0 ? [tagA, tagB] : [tagB, tagA];
    const firstOrder = [
      rankOf(firstRun.ranked, tagA) < rankOf(firstRun.ranked, tagB) ? tagA : tagB,
      rankOf(firstRun.ranked, tagA) < rankOf(firstRun.ranked, tagB) ? tagB : tagA,
    ];
    const secondOrder = [
      rankOf(secondRun.ranked, tagA) < rankOf(secondRun.ranked, tagB) ? tagA : tagB,
      rankOf(secondRun.ranked, tagA) < rankOf(secondRun.ranked, tagB) ? tagB : tagA,
    ];
    expect(firstOrder).toEqual(expectedOrder);
    expect(secondOrder).toEqual(expectedOrder);
  });
});

describe("POST /api/creator-looks/:lookId/like and unlike", () => {
  it("likes a drop and increments the like count", async () => {
    const creator = await createCreator("Like Target Muse", "like-target-creator");
    const viewer = await createCreator("Like Actor", "like-actor");
    const look = await createLook(creator.id, "Likeable drop");

    const response = await request(testApp)
      .post(`/api/creator-looks/${look.id}/like`)
      .set("Authorization", authHeaderFor(viewer.id));

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ liked: true, likeCount: 1 });
  });

  it("is idempotent when liking the same drop twice", async () => {
    const creator = await createCreator("Idempotent Like Muse", "idempotent-like-creator");
    const viewer = await createCreator("Idempotent Like Actor", "idempotent-like-actor");
    const look = await createLook(creator.id, "Double like target");

    await request(testApp)
      .post(`/api/creator-looks/${look.id}/like`)
      .set("Authorization", authHeaderFor(viewer.id));
    const second = await request(testApp)
      .post(`/api/creator-looks/${look.id}/like`)
      .set("Authorization", authHeaderFor(viewer.id));

    expect(second.status).toBe(200);
    expect(second.body.data.likeCount).toBe(1);
  });

  it("unlikes a previously liked drop and decrements the count", async () => {
    const creator = await createCreator("Unlike Target Muse", "unlike-target-creator");
    const viewer = await createCreator("Unlike Actor", "unlike-actor");
    const look = await createLook(creator.id, "Unlikeable drop");

    await request(testApp)
      .post(`/api/creator-looks/${look.id}/like`)
      .set("Authorization", authHeaderFor(viewer.id));
    const response = await request(testApp)
      .delete(`/api/creator-looks/${look.id}/like`)
      .set("Authorization", authHeaderFor(viewer.id));

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ liked: false, likeCount: 0 });
  });

  it("is a no-op unliking a drop that was never liked", async () => {
    const creator = await createCreator("Noop Unlike Muse", "noop-unlike-creator");
    const viewer = await createCreator("Noop Unlike Actor", "noop-unlike-actor");
    const look = await createLook(creator.id, "Never liked");

    const response = await request(testApp)
      .delete(`/api/creator-looks/${look.id}/like`)
      .set("Authorization", authHeaderFor(viewer.id));

    expect(response.status).toBe(200);
    expect(response.body.data.likeCount).toBe(0);
  });

  it("returns 404 liking a drop that doesn't exist", async () => {
    const viewer = await createCreator("Missing Like Actor", "missing-like-actor");

    const response = await request(testApp)
      .post(`/api/creator-looks/${randomUUID()}/like`)
      .set("Authorization", authHeaderFor(viewer.id));

    expect(response.status).toBe(404);
  });

  it("requires authentication to like", async () => {
    const response = await request(testApp).post(`/api/creator-looks/${randomUUID()}/like`);

    expect(response.status).toBe(401);
  });

  it("rejects a platform admin liking a drop", async () => {
    const creator = await createCreator("Admin Like Target Muse", "admin-like-target-creator");
    const admin = await createUserWithRole("Liking Admin", "liking-admin", UserRole.ADMIN);
    const look = await createLook(creator.id, "Off-limits to staff");

    const response = await request(testApp)
      .post(`/api/creator-looks/${look.id}/like`)
      .set("Authorization", authHeaderFor(admin.id, UserRole.ADMIN));

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("ADMIN_CANNOT_ENGAGE");

    const stored = await prisma.creatorLook.findUniqueOrThrow({ where: { id: look.id } });
    expect(stored.likeCount).toBe(0);
  });

  it("still allows a platform admin to unlike a drop from before this restriction shipped", async () => {
    const creator = await createCreator("Admin Unlike Target Muse", "admin-unlike-target-creator");
    const admin = await createUserWithRole("Unliking Admin", "unliking-admin", UserRole.ADMIN);
    const look = await createLook(creator.id, "Legacy admin like");
    await prisma.creatorLook.update({ where: { id: look.id }, data: { likeCount: 1 } });
    await prisma.creatorLookLike.create({ data: { creatorLookId: look.id, userId: admin.id } });

    const response = await request(testApp)
      .delete(`/api/creator-looks/${look.id}/like`)
      .set("Authorization", authHeaderFor(admin.id, UserRole.ADMIN));

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ liked: false, likeCount: 0 });
  });
});

describe("POST /api/creator-looks/:lookId/save and unsave", () => {
  it("saves a drop and increments the save count", async () => {
    const creator = await createCreator("Save Target Muse", "save-target-creator");
    const viewer = await createCreator("Save Actor", "save-actor");
    const look = await createLook(creator.id, "Saveable drop");

    const response = await request(testApp)
      .post(`/api/creator-looks/${look.id}/save`)
      .set("Authorization", authHeaderFor(viewer.id));

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ saved: true, saveCount: 1 });
  });

  it("is idempotent when saving the same drop twice", async () => {
    const creator = await createCreator("Idempotent Save Muse", "idempotent-save-creator");
    const viewer = await createCreator("Idempotent Save Actor", "idempotent-save-actor");
    const look = await createLook(creator.id, "Double save target");

    await request(testApp)
      .post(`/api/creator-looks/${look.id}/save`)
      .set("Authorization", authHeaderFor(viewer.id));
    const second = await request(testApp)
      .post(`/api/creator-looks/${look.id}/save`)
      .set("Authorization", authHeaderFor(viewer.id));

    expect(second.status).toBe(200);
    expect(second.body.data.saveCount).toBe(1);
  });

  it("unsaves a previously saved drop and decrements the count", async () => {
    const creator = await createCreator("Unsave Target Muse", "unsave-target-creator");
    const viewer = await createCreator("Unsave Actor", "unsave-actor");
    const look = await createLook(creator.id, "Unsaveable drop");

    await request(testApp)
      .post(`/api/creator-looks/${look.id}/save`)
      .set("Authorization", authHeaderFor(viewer.id));
    const response = await request(testApp)
      .delete(`/api/creator-looks/${look.id}/save`)
      .set("Authorization", authHeaderFor(viewer.id));

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ saved: false, saveCount: 0 });
  });

  it("is a no-op unsaving a drop that was never saved", async () => {
    const creator = await createCreator("Noop Unsave Muse", "noop-unsave-creator");
    const viewer = await createCreator("Noop Unsave Actor", "noop-unsave-actor");
    const look = await createLook(creator.id, "Never saved");

    const response = await request(testApp)
      .delete(`/api/creator-looks/${look.id}/save`)
      .set("Authorization", authHeaderFor(viewer.id));

    expect(response.status).toBe(200);
    expect(response.body.data.saveCount).toBe(0);
  });

  it("returns 404 saving a drop that doesn't exist", async () => {
    const viewer = await createCreator("Missing Save Actor", "missing-save-actor");

    const response = await request(testApp)
      .post(`/api/creator-looks/${randomUUID()}/save`)
      .set("Authorization", authHeaderFor(viewer.id));

    expect(response.status).toBe(404);
  });

  it("requires authentication to save", async () => {
    const response = await request(testApp).post(`/api/creator-looks/${randomUUID()}/save`);

    expect(response.status).toBe(401);
  });

  it("allows a platform admin to save and unsave a drop, unlike/comment/like", async () => {
    const creator = await createCreator("Admin Save Target Muse", "admin-save-target-creator");
    const admin = await createUserWithRole("Saving Admin", "saving-admin", UserRole.ADMIN);
    const look = await createLook(creator.id, "Admins can still bookmark this");

    const saveResponse = await request(testApp)
      .post(`/api/creator-looks/${look.id}/save`)
      .set("Authorization", authHeaderFor(admin.id, UserRole.ADMIN));
    expect(saveResponse.status).toBe(200);
    expect(saveResponse.body.data).toEqual({ saved: true, saveCount: 1 });

    const unsaveResponse = await request(testApp)
      .delete(`/api/creator-looks/${look.id}/save`)
      .set("Authorization", authHeaderFor(admin.id, UserRole.ADMIN));
    expect(unsaveResponse.status).toBe(200);
    expect(unsaveResponse.body.data).toEqual({ saved: false, saveCount: 0 });
  });
});

describe("GET and POST /api/creator-looks/:lookId/comments", () => {
  it("adds a comment and increments the comment count", async () => {
    const creator = await createCreator("Comment Target Muse", "comment-target-creator");
    const commenter = await createCreator("Commenter", "commenter");
    const look = await createLook(creator.id, "Commentable drop");

    const response = await request(testApp)
      .post(`/api/creator-looks/${look.id}/comments`)
      .set("Authorization", authHeaderFor(commenter.id))
      .send({ body: "Great fit!" });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({ body: "Great fit!", userId: commenter.id });

    const stored = await prisma.creatorLook.findUniqueOrThrow({ where: { id: look.id } });
    expect(stored.commentCount).toBe(1);
  });

  it("lists comments oldest first with cursor pagination", async () => {
    const creator = await createCreator("Comment List Muse", "comment-list-creator");
    const commenter = await createCreator("Comment Lister", "comment-lister");
    const look = await createLook(creator.id, "Comment list target");

    await request(testApp)
      .post(`/api/creator-looks/${look.id}/comments`)
      .set("Authorization", authHeaderFor(commenter.id))
      .send({ body: "First comment" });
    await request(testApp)
      .post(`/api/creator-looks/${look.id}/comments`)
      .set("Authorization", authHeaderFor(commenter.id))
      .send({ body: "Second comment" });

    const first = await request(testApp)
      .get(`/api/creator-looks/${look.id}/comments`)
      .query({ limit: 1 });

    expect(first.status).toBe(200);
    expect(first.body.data.comments[0].body).toBe("First comment");
    expect(first.body.data.nextCursor).not.toBeNull();

    const second = await request(testApp)
      .get(`/api/creator-looks/${look.id}/comments`)
      .query({ limit: 1, cursor: first.body.data.nextCursor });

    expect(second.status).toBe(200);
    expect(second.body.data.comments[0].body).toBe("Second comment");
  });

  it("returns an empty page when there are no comments", async () => {
    const creator = await createCreator("Empty Comments Muse", "empty-comments-creator");
    const look = await createLook(creator.id, "No comments yet");

    const response = await request(testApp).get(`/api/creator-looks/${look.id}/comments`);

    expect(response.status).toBe(200);
    expect(response.body.data.comments).toEqual([]);
  });

  it("returns 404 commenting on a drop that doesn't exist", async () => {
    const commenter = await createCreator("Missing Comment Actor", "missing-comment-actor");

    const response = await request(testApp)
      .post(`/api/creator-looks/${randomUUID()}/comments`)
      .set("Authorization", authHeaderFor(commenter.id))
      .send({ body: "Ghost comment" });

    expect(response.status).toBe(404);
  });

  it("returns 404 listing comments on a drop that doesn't exist", async () => {
    const response = await request(testApp).get(`/api/creator-looks/${randomUUID()}/comments`);

    expect(response.status).toBe(404);
  });

  it("requires authentication to comment", async () => {
    const creator = await createCreator("Auth Comment Muse", "auth-comment-creator");
    const look = await createLook(creator.id, "Needs auth to comment");

    const response = await request(testApp)
      .post(`/api/creator-looks/${look.id}/comments`)
      .send({ body: "Anonymous comment" });

    expect(response.status).toBe(401);
  });

  it("rejects an empty comment body", async () => {
    const creator = await createCreator("Empty Body Muse", "empty-body-creator");
    const commenter = await createCreator("Empty Body Commenter", "empty-body-commenter");
    const look = await createLook(creator.id, "Empty body target");

    const response = await request(testApp)
      .post(`/api/creator-looks/${look.id}/comments`)
      .set("Authorization", authHeaderFor(commenter.id))
      .send({ body: "" });

    expect(response.status).toBe(422);
  });

  it("rejects a platform admin commenting on a drop", async () => {
    const creator = await createCreator(
      "Admin Comment Target Muse",
      "admin-comment-target-creator",
    );
    const admin = await createUserWithRole("Commenting Admin", "commenting-admin", UserRole.ADMIN);
    const look = await createLook(creator.id, "Off-limits comment target");

    const response = await request(testApp)
      .post(`/api/creator-looks/${look.id}/comments`)
      .set("Authorization", authHeaderFor(admin.id, UserRole.ADMIN))
      .send({ body: "Nice fit" });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("ADMIN_CANNOT_ENGAGE");

    const stored = await prisma.creatorLook.findUniqueOrThrow({ where: { id: look.id } });
    expect(stored.commentCount).toBe(0);
  });
});

describe("DELETE /api/creator-looks/:lookId/comments/:commentId", () => {
  it("lets a comment's own author delete it", async () => {
    const creator = await createCreator("Comment Delete Muse", "comment-delete-creator");
    const commenter = await createCreator("Comment Deleter", "comment-deleter");
    const look = await createLook(creator.id, "Comment gets deleted");
    const comment = await prisma.creatorLookComment.create({
      data: { creatorLookId: look.id, userId: commenter.id, body: "Oops, deleting this" },
    });
    await prisma.creatorLook.update({ where: { id: look.id }, data: { commentCount: 1 } });

    const response = await request(testApp)
      .delete(`/api/creator-looks/${look.id}/comments/${comment.id}`)
      .set("Authorization", authHeaderFor(commenter.id));

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ deleted: true });

    const stored = await prisma.creatorLookComment.findUniqueOrThrow({
      where: { id: comment.id },
    });
    expect(stored.deletedAt).not.toBeNull();

    const storedLook = await prisma.creatorLook.findUniqueOrThrow({ where: { id: look.id } });
    expect(storedLook.commentCount).toBe(0);
  });

  it("returns 404 for a non-owner, non-moderator caller", async () => {
    const creator = await createCreator("Protected Comment Muse", "protected-comment-creator");
    const commenter = await createCreator("Protected Commenter", "protected-commenter");
    const outsider = await createCreator("Comment Outsider", "comment-outsider");
    const look = await createLook(creator.id, "Comment stays");
    const comment = await prisma.creatorLookComment.create({
      data: { creatorLookId: look.id, userId: commenter.id, body: "Not yours to delete" },
    });

    const response = await request(testApp)
      .delete(`/api/creator-looks/${look.id}/comments/${comment.id}`)
      .set("Authorization", authHeaderFor(outsider.id));

    expect(response.status).toBe(404);

    const stored = await prisma.creatorLookComment.findUniqueOrThrow({
      where: { id: comment.id },
    });
    expect(stored.deletedAt).toBeNull();
  });

  it("lets a platform moderator delete someone else's comment and logs it", async () => {
    const creator = await createCreator("Moderated Comment Muse", "moderated-comment-creator");
    const commenter = await createCreator("Moderated Commenter", "moderated-commenter");
    const moderator = await createContentModerator(
      "Comment Moderator",
      "content-moderator-comment",
    );
    const look = await createLook(creator.id, "Comment removed by staff");
    const comment = await prisma.creatorLookComment.create({
      data: { creatorLookId: look.id, userId: commenter.id, body: "Reported comment" },
    });

    const response = await request(testApp)
      .delete(`/api/creator-looks/${look.id}/comments/${comment.id}`)
      .set("Authorization", authHeaderFor(moderator.id, UserRole.ADMIN));

    expect(response.status).toBe(200);

    const auditLog = await prisma.platformAuditLog.findFirst({
      where: { targetType: "CreatorLookComment", targetId: comment.id },
    });
    expect(auditLog).toMatchObject({
      actorUserId: moderator.id,
      onBehalfOfUserId: commenter.id,
      action: PLATFORM_AUDIT_ACTION.CREATOR_LOOK_COMMENT_REMOVED_BY_ADMIN,
    });
  });

  it("returns 404 for a comment that doesn't exist", async () => {
    const creator = await createCreator("Missing Comment Muse", "missing-comment-creator");
    const look = await createLook(creator.id, "No such comment");

    const response = await request(testApp)
      .delete(`/api/creator-looks/${look.id}/comments/${randomUUID()}`)
      .set("Authorization", authHeaderFor(creator.id));

    expect(response.status).toBe(404);
  });

  it("cascades to every reply when a top-level comment is deleted", async () => {
    const creator = await createCreator("Cascade Muse", "cascade-creator");
    const commenter = await createCreator("Cascade Commenter", "cascade-commenter");
    const replier = await createCreator("Cascade Replier", "cascade-replier");
    const look = await createLook(creator.id, "Cascade target");
    const comment = await prisma.creatorLookComment.create({
      data: { creatorLookId: look.id, userId: commenter.id, body: "Parent comment" },
    });
    const replyOne = await prisma.creatorLookComment.create({
      data: {
        creatorLookId: look.id,
        userId: replier.id,
        parentCommentId: comment.id,
        body: "First reply",
      },
    });
    const replyTwo = await prisma.creatorLookComment.create({
      data: {
        creatorLookId: look.id,
        userId: replier.id,
        parentCommentId: comment.id,
        body: "Second reply",
      },
    });
    await prisma.creatorLookComment.update({
      where: { id: comment.id },
      data: { replyCount: 2 },
    });
    await prisma.creatorLook.update({ where: { id: look.id }, data: { commentCount: 3 } });

    const response = await request(testApp)
      .delete(`/api/creator-looks/${look.id}/comments/${comment.id}`)
      .set("Authorization", authHeaderFor(commenter.id));

    expect(response.status).toBe(200);

    const [storedComment, storedReplyOne, storedReplyTwo, storedLook] = await Promise.all([
      prisma.creatorLookComment.findUniqueOrThrow({ where: { id: comment.id } }),
      prisma.creatorLookComment.findUniqueOrThrow({ where: { id: replyOne.id } }),
      prisma.creatorLookComment.findUniqueOrThrow({ where: { id: replyTwo.id } }),
      prisma.creatorLook.findUniqueOrThrow({ where: { id: look.id } }),
    ]);
    expect(storedComment.deletedAt).not.toBeNull();
    expect(storedReplyOne.deletedAt).not.toBeNull();
    expect(storedReplyTwo.deletedAt).not.toBeNull();
    expect(storedLook.commentCount).toBe(0);
  });

  it("deleting a single reply only decrements the parent's reply count by one", async () => {
    const creator = await createCreator("Single Reply Muse", "single-reply-creator");
    const commenter = await createCreator("Single Reply Commenter", "single-reply-commenter");
    const replier = await createCreator("Single Replier", "single-replier");
    const look = await createLook(creator.id, "Single reply target");
    const comment = await prisma.creatorLookComment.create({
      data: { creatorLookId: look.id, userId: commenter.id, body: "Parent stays" },
    });
    const reply = await prisma.creatorLookComment.create({
      data: {
        creatorLookId: look.id,
        userId: replier.id,
        parentCommentId: comment.id,
        body: "Reply goes away",
      },
    });
    await prisma.creatorLookComment.update({ where: { id: comment.id }, data: { replyCount: 1 } });
    await prisma.creatorLook.update({ where: { id: look.id }, data: { commentCount: 2 } });

    const response = await request(testApp)
      .delete(`/api/creator-looks/${look.id}/comments/${reply.id}`)
      .set("Authorization", authHeaderFor(replier.id));

    expect(response.status).toBe(200);

    const [storedReply, storedParent, storedLook] = await Promise.all([
      prisma.creatorLookComment.findUniqueOrThrow({ where: { id: reply.id } }),
      prisma.creatorLookComment.findUniqueOrThrow({ where: { id: comment.id } }),
      prisma.creatorLook.findUniqueOrThrow({ where: { id: look.id } }),
    ]);
    expect(storedReply.deletedAt).not.toBeNull();
    expect(storedParent.deletedAt).toBeNull();
    expect(storedParent.replyCount).toBe(0);
    expect(storedLook.commentCount).toBe(1);
  });

  it("requires authentication", async () => {
    const response = await request(testApp).delete(
      `/api/creator-looks/${randomUUID()}/comments/${randomUUID()}`,
    );

    expect(response.status).toBe(401);
  });
});

describe("POST /api/creator-looks/:lookId/comments/:commentId/replies", () => {
  it("rejects a platform admin replying to a comment", async () => {
    const creator = await createCreator("Admin Reply Target Muse", "admin-reply-target-creator");
    const commenter = await createCreator("Reply Thread Starter", "reply-thread-starter");
    const admin = await createUserWithRole("Replying Admin", "replying-admin", UserRole.ADMIN);
    const look = await createLook(creator.id, "Off-limits reply target");
    const comment = await prisma.creatorLookComment.create({
      data: { creatorLookId: look.id, userId: commenter.id, body: "Starting a thread" },
    });

    const response = await request(testApp)
      .post(`/api/creator-looks/${look.id}/comments/${comment.id}/replies`)
      .set("Authorization", authHeaderFor(admin.id, UserRole.ADMIN))
      .send({ body: "Staff reply" });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("ADMIN_CANNOT_ENGAGE");
  });
});

describe("POST /api/creator-looks/:lookId/tags/:productId/click", () => {
  it("records a tag click for an anonymous viewer", async () => {
    const creator = await createCreator("Tag Click Muse", "tag-click-creator");
    const product = await createApprovedProduct("Clickable Sneakers");
    const look = await createLook(creator.id, "Tag click target");
    await tagProduct(look.id, product.id);

    const response = await request(testApp)
      .post(`/api/creator-looks/${look.id}/tags/${product.id}/click`)
      .send({ sessionId: randomUUID(), source: "FEED" });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ recorded: true });

    const stored = await prisma.creatorLookTagClick.findFirst({
      where: { creatorLookId: look.id, productId: product.id },
    });
    expect(stored).not.toBeNull();
    expect(stored?.userId).toBeNull();
  });

  it("records the viewer id when the caller is authenticated", async () => {
    const creator = await createCreator("Auth Tag Click Muse", "auth-tag-click-creator");
    const viewer = await createCreator("Tag Click Viewer", "tag-click-viewer");
    const product = await createApprovedProduct("Auth Clickable Bag");
    const look = await createLook(creator.id, "Auth tag click target");
    await tagProduct(look.id, product.id);

    const response = await request(testApp)
      .post(`/api/creator-looks/${look.id}/tags/${product.id}/click`)
      .set("Authorization", authHeaderFor(viewer.id))
      .send({ sessionId: randomUUID(), source: "PRODUCT_PAGE" });

    expect(response.status).toBe(200);

    const stored = await prisma.creatorLookTagClick.findFirst({
      where: { creatorLookId: look.id, productId: product.id },
    });
    expect(stored?.userId).toBe(viewer.id);
    expect(stored?.source).toBe("PRODUCT_PAGE");
  });

  it("returns 404 for a drop that doesn't exist", async () => {
    const response = await request(testApp)
      .post(`/api/creator-looks/${randomUUID()}/tags/${randomUUID()}/click`)
      .send({ sessionId: randomUUID() });

    expect(response.status).toBe(404);
  });

  it("returns 404 when the product isn't tagged in this look", async () => {
    const creator = await createCreator("Untagged Click Muse", "untagged-click-creator");
    const product = await createApprovedProduct("Untagged Product");
    const look = await createLook(creator.id, "No tags here");

    const response = await request(testApp)
      .post(`/api/creator-looks/${look.id}/tags/${product.id}/click`)
      .send({ sessionId: randomUUID() });

    expect(response.status).toBe(404);
  });

  it("rejects a missing sessionId", async () => {
    const creator = await createCreator("Missing Session Muse", "missing-session-creator");
    const product = await createApprovedProduct("Missing Session Product");
    const look = await createLook(creator.id, "Missing session target");
    await tagProduct(look.id, product.id);

    const response = await request(testApp)
      .post(`/api/creator-looks/${look.id}/tags/${product.id}/click`)
      .send({});

    expect(response.status).toBe(422);
  });
});

describe("GET /api/creator-looks/feed", () => {
  it("defaults to the for_you tab for an anonymous caller and falls back to the legacy trending snapshot", async () => {
    const creator = await createCreator("Feed Default Muse", "feed-default-creator");
    await createLook(creator.id, "Default feed drop");

    const response = await request(testApp).get("/api/creator-looks/feed");

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty("posts");
    expect(response.body.data).toHaveProperty("nextCursor");
  });

  it("requires authentication for the following tab", async () => {
    const response = await request(testApp)
      .get("/api/creator-looks/feed")
      .query({ tab: "following" });

    expect(response.status).toBe(401);
  });

  it("returns an empty following tab, not trending drops, when the viewer follows nobody", async () => {
    const viewer = await createCreator("No Follows Viewer", "no-follows-viewer");
    const strangerCreator = await createCreator("Unfollowed Poster", "unfollowed-poster");
    await createLook(strangerCreator.id, "Drop from a muse nobody follows");

    const response = await request(testApp)
      .get("/api/creator-looks/feed")
      .query({ tab: "following" })
      .set("Authorization", authHeaderFor(viewer.id));

    expect(response.status).toBe(200);
    expect(response.body.data.posts).toEqual([]);
    expect(response.body.data.nextCursor).toBeNull();
  });

  it("restricts the following tab to drops from followed muses", async () => {
    const followedCreator = await createCreator("Followed Muse", "followed-creator");
    const unfollowedCreator = await createCreator("Unfollowed Muse", "unfollowed-creator");
    const viewer = await createCreator("Following Tab Viewer", "following-tab-viewer");
    const followedLook = await createLook(followedCreator.id, "From a followed muse");
    await createLook(unfollowedCreator.id, "From someone not followed");
    await followCreator(viewer.id, followedCreator.id);

    const response = await request(testApp)
      .get("/api/creator-looks/feed")
      .query({ tab: "following" })
      .set("Authorization", authHeaderFor(viewer.id));

    expect(response.status).toBe(200);
    const ids = response.body.data.posts.map((post: { id: string }) => post.id);
    expect(ids).toContain(followedLook.id);
  });

  it("paginates the following tab using nextCursor", async () => {
    const followedCreator = await createCreator("Paged Followed Muse", "paged-followed-creator");
    const viewer = await createCreator("Paged Following Viewer", "paged-following-viewer");
    const lookOne = await createLook(followedCreator.id, "Paged following drop one");
    const lookTwo = await createLook(followedCreator.id, "Paged following drop two");
    await followCreator(viewer.id, followedCreator.id);

    const first = await request(testApp)
      .get("/api/creator-looks/feed")
      .query({ tab: "following", limit: 1 })
      .set("Authorization", authHeaderFor(viewer.id));

    expect(first.status).toBe(200);
    expect(first.body.data.posts).toHaveLength(1);
    expect(first.body.data.posts[0].id).toBe(lookTwo.id);
    expect(first.body.data.nextCursor).not.toBeNull();

    const second = await request(testApp)
      .get("/api/creator-looks/feed")
      .query({ tab: "following", limit: 1, cursor: first.body.data.nextCursor })
      .set("Authorization", authHeaderFor(viewer.id));

    expect(second.status).toBe(200);
    expect(second.body.data.posts[0].id).toBe(lookOne.id);
  });

  it("carries the tagged product's size and the muse's height when the muse shows it", async () => {
    const creator = await createCreator("Height Visible Muse", "height-visible-creator");
    await prisma.user.update({
      where: { id: creator.id },
      data: { heightCm: 168, showHeight: true },
    });
    const viewer = await createCreator("Height Feed Viewer", "height-feed-viewer");
    const look = await createLook(creator.id, "Drop with a sized tag");
    const product = await createApprovedProduct("Sized Product");
    await tagProduct(look.id, product.id, "M");
    await followCreator(viewer.id, creator.id);

    const response = await request(testApp)
      .get("/api/creator-looks/feed")
      .query({ tab: "following" })
      .set("Authorization", authHeaderFor(viewer.id));

    expect(response.status).toBe(200);
    expect(response.body.data.posts[0].creator.heightCm).toBe(168);
    expect(response.body.data.posts[0].taggedProducts[0].sizeWorn).toBe("M");
  });

  it("hides the muse's height on the feed when they have chosen not to show it", async () => {
    const creator = await createCreator("Height Hidden Muse", "height-hidden-creator");
    await prisma.user.update({
      where: { id: creator.id },
      data: { heightCm: 168, showHeight: false },
    });
    const viewer = await createCreator("Height Hidden Feed Viewer", "height-hidden-feed-viewer");
    await createLook(creator.id, "Drop from a muse hiding their height");
    await followCreator(viewer.id, creator.id);

    const response = await request(testApp)
      .get("/api/creator-looks/feed")
      .query({ tab: "following" })
      .set("Authorization", authHeaderFor(viewer.id));

    expect(response.status).toBe(200);
    expect(response.body.data.posts[0].creator.heightCm).toBeNull();
  });

  it("filters the feed by an arbitrary hashtag tab", async () => {
    const creator = await createCreator("Hashtag Tab Muse", "hashtag-tab-creator");
    const marker = randomUUID().slice(0, 6);
    const look = await createLook(creator.id, `Tagged drop #feedtag${marker}`);
    await prisma.creatorLookHashtag.create({
      data: { creatorLookId: look.id, tag: `feedtag${marker}` },
    });

    const response = await request(testApp)
      .get("/api/creator-looks/feed")
      .query({ tab: `feedtag${marker}` });

    expect(response.status).toBe(200);
    expect(response.body.data.posts.map((post: { id: string }) => post.id)).toEqual([look.id]);
  });

  it("personalizes the for_you tab once the trending pipeline has scored drops, applying follow, engagement, and hashtag boosts with a per-creator diversity cap", async () => {
    const busyCreator = await createCreator("Busy Muse", "busy-creator");
    const followedCreator = await createCreator(
      "Boosted Followed Muse",
      "boosted-followed-creator",
    );
    const engagedCreator = await createCreator("Boosted Engaged Muse", "boosted-engaged-creator");
    const viewer = await createCreator("Personalized Viewer", "personalized-viewer");
    const marker = randomUUID().slice(0, 6);

    const busyLooks = await Promise.all(
      Array.from({ length: 4 }, (_, index) =>
        createLook(busyCreator.id, `Busy muse drop ${index} #shared${marker}`),
      ),
    );
    const followedLook = await createLook(followedCreator.id, `Followed drop #shared${marker}`);
    const engagedLook = await createLook(engagedCreator.id, `Engaged drop #shared${marker}`);
    const unengagedCreator = await createCreator("Unengaged Muse", "unengaged-creator");
    const unengagedViewer = await createCreator("Unengaged Viewer", "unengaged-viewer");
    const unengagedLook = await createLook(
      unengagedCreator.id,
      `Unengaged drop #different${marker}`,
    );
    await prisma.creatorLookHashtag.create({
      data: { creatorLookId: unengagedLook.id, tag: `different${marker}` },
    });
    await prisma.creatorLookLike.create({
      data: { creatorLookId: unengagedLook.id, userId: unengagedViewer.id },
    });

    for (const look of [...busyLooks, followedLook, engagedLook]) {
      await prisma.creatorLookHashtag.create({
        data: { creatorLookId: look.id, tag: `shared${marker}` },
      });
      await prisma.creatorLookLike.create({ data: { creatorLookId: look.id, userId: viewer.id } });
    }

    await followCreator(viewer.id, followedCreator.id);
    await prisma.creatorLookSave.create({
      data: { creatorLookId: engagedLook.id, userId: viewer.id },
    });

    await creatorLookService.runTrendingAggregation();
    const { ranked } = await creatorLookService.runTrendingScoring();
    expect(ranked.length).toBeGreaterThan(0);

    const first = await request(testApp)
      .get("/api/creator-looks/feed")
      .query({ tab: "for_you", limit: 1 })
      .set("Authorization", authHeaderFor(viewer.id));

    expect(first.status).toBe(200);
    expect(first.body.data.posts).toHaveLength(1);
    expect(first.body.data.nextCursor).not.toBeNull();

    const second = await request(testApp)
      .get("/api/creator-looks/feed")
      .query({ tab: "for_you", limit: 30, cursor: first.body.data.nextCursor })
      .set("Authorization", authHeaderFor(viewer.id));

    expect(second.status).toBe(200);
    const busyLookIdsInFeed = second.body.data.posts.filter(
      (post: { creator: { id: string } }) => post.creator.id === busyCreator.id,
    );
    expect(busyLookIdsInFeed.length).toBeLessThanOrEqual(3);
  });

  it("surfaces a followed muse's brand-new, not-yet-trending drop in for_you, not just re-ranked trending content", async () => {
    const trendingCreator = await createCreator("Discovery Muse", "discovery-creator");
    const followedCreator = await createCreator("Quiet Followed Muse", "quiet-followed-creator");
    const engager = await createCreator("Discovery Engager", "discovery-engager");
    const viewer = await createCreator("Followed Discovery Viewer", "followed-discovery-viewer");

    const trendingLook = await createLook(trendingCreator.id, "Discovery trending drop");
    await prisma.creatorLookLike.create({
      data: { creatorLookId: trendingLook.id, userId: engager.id },
    });
    const quietFollowedLook = await createLook(followedCreator.id, "Quiet followed drop");

    await followCreator(viewer.id, followedCreator.id);
    await creatorLookService.runTrendingAggregation();
    const { ranked } = await creatorLookService.runTrendingScoring();
    expect(ranked.some((entry) => entry.lookId === quietFollowedLook.id)).toBe(false);

    const response = await request(testApp)
      .get("/api/creator-looks/feed")
      .query({ tab: "for_you", limit: 30 })
      .set("Authorization", authHeaderFor(viewer.id));

    expect(response.status).toBe(200);
    const ids = response.body.data.posts.map((post: { id: string }) => post.id);
    expect(ids).toContain(quietFollowedLook.id);
    expect(ids).toContain(trendingLook.id);
  });

  it("pads a signed-in for_you feed with recent drops when few drops are trending, matching what an anonymous visitor sees", async () => {
    const trendingCreator = await createCreator("Pad Trending Muse", "pad-trending-creator");
    const recentCreator = await createCreator("Pad Recent Muse", "pad-recent-creator");
    const engager = await createCreator("Pad Engager", "pad-engager");
    const viewer = await createCreator("Pad Viewer", "pad-viewer");

    const trendingLook = await createLook(trendingCreator.id, "Pad trending drop");
    await prisma.creatorLookLike.create({
      data: { creatorLookId: trendingLook.id, userId: engager.id },
    });
    const recentLook = await createLook(recentCreator.id, "Pad recent untrended drop");

    await creatorLookService.runTrendingAggregation();
    await creatorLookService.runTrendingScoring();

    const signedInResponse = await request(testApp)
      .get("/api/creator-looks/feed")
      .query({ tab: "for_you", limit: 30 })
      .set("Authorization", authHeaderFor(viewer.id));
    const anonymousResponse = await request(testApp)
      .get("/api/creator-looks/feed")
      .query({ tab: "for_you", limit: 30 });

    expect(signedInResponse.status).toBe(200);
    const signedInIds = signedInResponse.body.data.posts.map((post: { id: string }) => post.id);
    const anonymousIds = anonymousResponse.body.data.posts.map((post: { id: string }) => post.id);
    expect(signedInIds).toContain(trendingLook.id);
    expect(signedInIds).toContain(recentLook.id);
    expect(anonymousIds).toContain(recentLook.id);
  });

  it("only flags genuinely-scored drops as trending in for_you, not the followed drops interleaved in for personalization", async () => {
    const trendingCreator = await createCreator("Rank Discovery Muse", "rank-discovery-creator");
    const followedCreator = await createCreator(
      "Rank Quiet Followed Muse",
      "rank-quiet-followed-creator",
    );
    const engager = await createCreator("Rank Discovery Engager", "rank-discovery-engager");
    const viewer = await createCreator("Rank Discovery Viewer", "rank-discovery-viewer");

    const trendingLook = await createLook(trendingCreator.id, "Rank discovery trending drop");
    await prisma.creatorLookLike.create({
      data: { creatorLookId: trendingLook.id, userId: engager.id },
    });
    const quietFollowedLook = await createLook(followedCreator.id, "Rank quiet followed drop");

    await followCreator(viewer.id, followedCreator.id);
    await creatorLookService.runTrendingAggregation();
    await creatorLookService.runTrendingScoring();

    const response = await request(testApp)
      .get("/api/creator-looks/feed")
      .query({ tab: "for_you", limit: 30 })
      .set("Authorization", authHeaderFor(viewer.id));

    expect(response.status).toBe(200);
    const posts = response.body.data.posts as { id: string; isTrending: boolean }[];
    expect(posts.find((post) => post.id === trendingLook.id)?.isTrending).toBe(true);
    expect(posts.find((post) => post.id === quietFollowedLook.id)?.isTrending).toBe(false);
  });

  it("keeps the for_you candidate set stable across repeat page-1 requests, even once a new drop starts scoring in between", async () => {
    const creatorA = await createCreator("Stable Muse A", "stable-creator-a");
    const neutralViewer = await createCreator("Stable Neutral Viewer", "stable-neutral-viewer");
    const viewer = await createCreator("Stable Ranking Viewer", "stable-ranking-viewer");

    const lookA = await createLook(creatorA.id, "Stable ranking drop A");
    await prisma.creatorLookLike.create({
      data: { creatorLookId: lookA.id, userId: neutralViewer.id },
    });
    await creatorLookService.runTrendingAggregation();
    await creatorLookService.runTrendingScoring();

    const first = await request(testApp)
      .get("/api/creator-looks/feed")
      .query({ tab: "for_you", limit: 30 })
      .set("Authorization", authHeaderFor(viewer.id));
    expect(first.status).toBe(200);
    const firstIds = first.body.data.posts.map((post: { id: string }) => post.id);
    expect(firstIds).toContain(lookA.id);

    const creatorC = await createCreator("Stable Muse C", "stable-creator-c");
    const lookC = await createLook(creatorC.id, "Newly scored drop C");
    await prisma.creatorLookLike.create({
      data: { creatorLookId: lookC.id, userId: neutralViewer.id },
    });
    await creatorLookService.runTrendingAggregation();
    await creatorLookService.runTrendingScoring();

    const second = await request(testApp)
      .get("/api/creator-looks/feed")
      .query({ tab: "for_you", limit: 30 })
      .set("Authorization", authHeaderFor(viewer.id));
    expect(second.status).toBe(200);
    const secondIds = second.body.data.posts.map((post: { id: string }) => post.id);

    expect(secondIds).toEqual(firstIds);
    expect(secondIds).not.toContain(lookC.id);
  });

  it("computes a fresh personalized score when nothing is cached yet", async () => {
    const creator = await createCreator("Fresh Score Muse", "fresh-score-creator");
    const viewer = await createCreator("Fresh Score Viewer", "fresh-score-viewer");
    const look = await createLook(creator.id, "Fresh score drop");
    await prisma.creatorLookLike.create({ data: { creatorLookId: look.id, userId: viewer.id } });
    await creatorLookService.runTrendingAggregation();

    const response = await request(testApp)
      .get("/api/creator-looks/feed")
      .query({ tab: "for_you" })
      .set("Authorization", authHeaderFor(viewer.id));

    expect(response.status).toBe(200);
    expect(response.body.data.posts.some((post: { id: string }) => post.id === look.id)).toBe(true);
  });

  it("falls back to the legacy trending snapshot for an authenticated viewer when no drop has ever scored, without flagging it as trending", async () => {
    const creator = await createCreator("No Score Muse", "no-score-creator");
    const viewer = await createCreator("No Score Viewer", "no-score-viewer");
    const look = await createLook(creator.id, "Never scored drop");

    const response = await request(testApp)
      .get("/api/creator-looks/feed")
      .query({ tab: "for_you" })
      .set("Authorization", authHeaderFor(viewer.id));

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty("posts");
    const posts = response.body.data.posts as { id: string; isTrending: boolean }[];
    expect(posts.find((post) => post.id === look.id)?.isTrending).toBe(false);
  });

  it("fills for_you and trending with older drops when nothing was posted in the recent window, instead of going blank", async () => {
    const creator = await createCreator("Quiet Spell Muse", "quiet-spell-creator");
    const viewer = await createCreator("Quiet Spell Viewer", "quiet-spell-viewer");
    const olderLook = await createLook(creator.id, "Drop from a month ago");
    await prisma.creatorLook.update({
      where: { id: olderLook.id },
      data: { createdAt: subDays(new Date(), OLDER_DROP_AGE_DAYS) },
    });

    const anonymousForYou = await request(testApp)
      .get("/api/creator-looks/feed")
      .query({ tab: "for_you" });
    const signedInForYou = await request(testApp)
      .get("/api/creator-looks/feed")
      .query({ tab: "for_you" })
      .set("Authorization", authHeaderFor(viewer.id));
    const trending = await request(testApp)
      .get("/api/creator-looks/feed")
      .query({ tab: "trending" });

    for (const response of [anonymousForYou, signedInForYou, trending]) {
      expect(response.status).toBe(200);
      const posts = response.body.data.posts as { id: string; isTrending: boolean }[];
      expect(posts.map((post) => post.id)).toEqual([olderLook.id]);
      expect(posts[0]?.isTrending).toBe(false);
    }
  });

  it("keeps deleted drops and drops from unapproved muses out of the older-drops fallback", async () => {
    const approvedCreator = await createCreator("Fallback Approved Muse", "fallback-approved");
    const pendingCreator = await createCreator("Fallback Pending Muse", "fallback-pending");
    await prisma.user.update({
      where: { id: pendingCreator.id },
      data: { creatorStatus: CreatorStatus.PENDING },
    });
    const visibleLook = await createLook(approvedCreator.id, "Visible older drop");
    const deletedLook = await createLook(approvedCreator.id, "Deleted older drop");
    const pendingLook = await createLook(pendingCreator.id, "Pending muse older drop");
    await prisma.creatorLook.updateMany({
      where: { id: { in: [visibleLook.id, deletedLook.id, pendingLook.id] } },
      data: { createdAt: subDays(new Date(), OLDER_DROP_AGE_DAYS) },
    });
    await prisma.creatorLook.update({
      where: { id: deletedLook.id },
      data: { deletedAt: new Date() },
    });

    const response = await request(testApp)
      .get("/api/creator-looks/feed")
      .query({ tab: "trending" });

    const ids = (response.body.data.posts as { id: string }[]).map((post) => post.id);
    expect(ids).toEqual([visibleLook.id]);
  });

  it("still caps each muse's older drops in for_you", async () => {
    const prolificCreator = await createCreator("Prolific Older Muse", "prolific-older-creator");
    const olderLooks = await Promise.all(
      Array.from({ length: PROLIFIC_OLDER_DROP_COUNT }, (_, index) =>
        createLook(prolificCreator.id, `Prolific older drop ${index}`),
      ),
    );
    await prisma.creatorLook.updateMany({
      where: { id: { in: olderLooks.map((look) => look.id) } },
      data: { createdAt: subDays(new Date(), OLDER_DROP_AGE_DAYS) },
    });

    const response = await request(testApp)
      .get("/api/creator-looks/feed")
      .query({ tab: "for_you", limit: 30 });

    expect(response.body.data.posts).toHaveLength(FOR_YOU_MAX_PER_CREATOR);
  });

  it("does not cache an empty for_you ranking, so a drop posted right after shows up on the next load", async () => {
    const creator = await createCreator("First Drop Muse", "first-drop-creator");
    const viewer = await createCreator("First Drop Viewer", "first-drop-viewer");

    const emptyResponse = await request(testApp)
      .get("/api/creator-looks/feed")
      .query({ tab: "for_you" })
      .set("Authorization", authHeaderFor(viewer.id));
    expect(emptyResponse.body.data.posts).toEqual([]);
    expect(await redis.exists(redisKeys.cache("explore-for-you-stable-ranking", viewer.id))).toBe(
      0,
    );

    const firstLook = await createLook(creator.id, "First ever drop");
    const response = await request(testApp)
      .get("/api/creator-looks/feed")
      .query({ tab: "for_you" })
      .set("Authorization", authHeaderFor(viewer.id));

    const ids = (response.body.data.posts as { id: string }[]).map((post) => post.id);
    expect(ids).toEqual([firstLook.id]);
  });

  it("paginates the trending tab with a stable snapshot across pages", async () => {
    const creator = await createCreator("Trending Page Muse", "trending-page-creator");
    await createLook(creator.id, "Trending page drop one");
    await createLook(creator.id, "Trending page drop two");

    const first = await request(testApp)
      .get("/api/creator-looks/feed")
      .query({ tab: "trending", limit: 1 });

    expect(first.status).toBe(200);
    expect(first.body.data.posts).toHaveLength(1);

    if (first.body.data.nextCursor) {
      const second = await request(testApp)
        .get("/api/creator-looks/feed")
        .query({ tab: "trending", limit: 1, cursor: first.body.data.nextCursor });

      expect(second.status).toBe(200);
      expect(second.body.data.posts[0]?.id).not.toBe(first.body.data.posts[0]?.id);
    }
  });

  it("drops a drop from the trending tab once it's deleted, even while its snapshot cache is warm", async () => {
    const creator = await createCreator("Stale Trending Muse", "stale-trending-creator");
    const engager = await createCreator("Stale Trending Engager", "stale-trending-engager");
    const look = await createLook(creator.id, "Stale trending drop");
    await prisma.creatorLookLike.create({ data: { creatorLookId: look.id, userId: engager.id } });
    await creatorLookService.runTrendingAggregation();
    await creatorLookService.runTrendingScoring();

    const before = await request(testApp).get("/api/creator-looks/feed").query({ tab: "trending" });
    expect(before.body.data.posts.map((post: { id: string }) => post.id)).toContain(look.id);

    await prisma.creatorLook.update({ where: { id: look.id }, data: { deletedAt: new Date() } });

    const after = await request(testApp).get("/api/creator-looks/feed").query({ tab: "trending" });
    expect(after.body.data.posts.map((post: { id: string }) => post.id)).not.toContain(look.id);
  });

  it("drops a drop from the for_you tab once it's deleted, even while its snapshot cache is warm", async () => {
    const creator = await createCreator("Stale For You Muse", "stale-for-you-creator");
    const engager = await createCreator("Stale For You Engager", "stale-for-you-engager");
    const look = await createLook(creator.id, "Stale for-you drop");
    await prisma.creatorLookLike.create({ data: { creatorLookId: look.id, userId: engager.id } });
    await creatorLookService.runTrendingAggregation();
    await creatorLookService.runTrendingScoring();

    const viewerBefore = await createCreator(
      "Stale For You Viewer Before",
      "stale-for-you-viewer-a",
    );
    const before = await request(testApp)
      .get("/api/creator-looks/feed")
      .query({ tab: "for_you" })
      .set("Authorization", authHeaderFor(viewerBefore.id));
    expect(before.body.data.posts.map((post: { id: string }) => post.id)).toContain(look.id);

    await prisma.creatorLook.update({ where: { id: look.id }, data: { deletedAt: new Date() } });

    const viewerAfter = await createCreator("Stale For You Viewer After", "stale-for-you-viewer-b");
    const after = await request(testApp)
      .get("/api/creator-looks/feed")
      .query({ tab: "for_you" })
      .set("Authorization", authHeaderFor(viewerAfter.id));
    expect(after.body.data.posts.map((post: { id: string }) => post.id)).not.toContain(look.id);
  });

  it("resumes the trending tab from where it left off instead of rewinding to page one when the session snapshot expires mid-scroll", async () => {
    const creator = await createCreator("Resume Trending Muse", "resume-trending-creator");
    const engagerOne = await createCreator("Resume Trending Engager One", "resume-trending-eng-1");
    const engagerTwo = await createCreator("Resume Trending Engager Two", "resume-trending-eng-2");
    const topLook = await createLook(creator.id, "Resume trending top drop");
    const secondLook = await createLook(creator.id, "Resume trending second drop");
    await prisma.creatorLookLike.createMany({
      data: [
        { creatorLookId: topLook.id, userId: engagerOne.id },
        { creatorLookId: topLook.id, userId: engagerTwo.id },
        { creatorLookId: secondLook.id, userId: engagerOne.id },
      ],
    });
    await creatorLookService.runTrendingAggregation();
    await creatorLookService.runTrendingScoring();

    const first = await request(testApp)
      .get("/api/creator-looks/feed")
      .query({ tab: "trending", limit: 1 });
    expect(first.body.data.posts[0]?.id).toBe(topLook.id);
    expect(first.body.data.posts[0]?.isTrending).toBe(true);
    expect(first.body.data.nextCursor).not.toBeNull();

    const firstCursor = decodeCursor<TrendingSnapshotCursor>(first.body.data.nextCursor);
    await redis.del(redisKeys.cache("explore-trending-snapshot", firstCursor?.sessionId ?? ""));

    const second = await request(testApp)
      .get("/api/creator-looks/feed")
      .query({ tab: "trending", limit: 1, cursor: first.body.data.nextCursor });

    expect(second.body.data.posts[0]?.id).toBe(secondLook.id);
  });

  it("resumes the for_you tab from where it left off instead of rewinding to page one when the session snapshot expires mid-scroll", async () => {
    const creator = await createCreator("Resume For You Muse", "resume-for-you-creator");
    const engagerOne = await createCreator("Resume For You Engager One", "resume-for-you-eng-1");
    const engagerTwo = await createCreator("Resume For You Engager Two", "resume-for-you-eng-2");
    const viewer = await createCreator("Resume For You Viewer", "resume-for-you-viewer");
    const topLook = await createLook(creator.id, "Resume for-you top drop");
    const secondLook = await createLook(creator.id, "Resume for-you second drop");
    await prisma.creatorLookLike.createMany({
      data: [
        { creatorLookId: topLook.id, userId: engagerOne.id },
        { creatorLookId: topLook.id, userId: engagerTwo.id },
        { creatorLookId: secondLook.id, userId: engagerOne.id },
      ],
    });
    await creatorLookService.runTrendingAggregation();
    await creatorLookService.runTrendingScoring();

    const first = await request(testApp)
      .get("/api/creator-looks/feed")
      .query({ tab: "for_you", limit: 1 })
      .set("Authorization", authHeaderFor(viewer.id));
    expect(first.body.data.posts[0]?.id).toBe(topLook.id);
    expect(first.body.data.nextCursor).not.toBeNull();

    const firstCursor = decodeCursor<TrendingSnapshotCursor>(first.body.data.nextCursor);
    await redis.del(redisKeys.cache("explore-for-you-snapshot", firstCursor?.sessionId ?? ""));

    const second = await request(testApp)
      .get("/api/creator-looks/feed")
      .query({ tab: "for_you", limit: 1, cursor: first.body.data.nextCursor })
      .set("Authorization", authHeaderFor(viewer.id));

    expect(second.body.data.posts[0]?.id).toBe(secondLook.id);
  });

  it("recomputes on demand once an empty cached score result has expired, instead of staying suppressed", async () => {
    const creator = await createCreator("Self Heal Muse", "self-heal-creator");
    const viewer = await createCreator("Self Heal Viewer", "self-heal-viewer");
    const look = await createLook(creator.id, "Self heal drop");
    await prisma.creatorLookLike.create({ data: { creatorLookId: look.id, userId: viewer.id } });
    await creatorLookService.runTrendingAggregation();

    await redis.set(
      redisKeys.cache("explore-trending-score", "global"),
      JSON.stringify([]),
      "PX",
      50,
    );
    await new Promise((resolve) => setTimeout(resolve, 80));

    const response = await request(testApp)
      .get("/api/creator-looks/feed")
      .query({ tab: "trending" });

    expect(response.status).toBe(200);
    const posts = response.body.data.posts as { id: string; isTrending: boolean }[];
    expect(posts.find((post) => post.id === look.id)?.isTrending).toBe(true);
  });

  it("shows scored trending drops first, followed by unscored recent drops, without marking the fallback ones as trending", async () => {
    const scoredCreator = await createCreator("Hybrid Scored Muse", "hybrid-scored-creator");
    const engager = await createCreator("Hybrid Engager", "hybrid-engager");
    const quietCreator = await createCreator("Hybrid Quiet Muse", "hybrid-quiet-creator");

    const scoredLook = await createLook(scoredCreator.id, "Hybrid scored drop");
    await prisma.creatorLookLike.create({
      data: { creatorLookId: scoredLook.id, userId: engager.id },
    });
    const quietLook = await createLook(quietCreator.id, "Hybrid quiet drop");

    await creatorLookService.runTrendingAggregation();
    const { ranked } = await creatorLookService.runTrendingScoring();
    expect(ranked.some((entry) => entry.lookId === scoredLook.id)).toBe(true);
    expect(ranked.some((entry) => entry.lookId === quietLook.id)).toBe(false);

    const response = await request(testApp)
      .get("/api/creator-looks/feed")
      .query({ tab: "trending", limit: 30 });

    const posts = response.body.data.posts as { id: string; isTrending: boolean }[];
    const scoredIndex = posts.findIndex((post) => post.id === scoredLook.id);
    const quietIndex = posts.findIndex((post) => post.id === quietLook.id);

    expect(scoredIndex).toBeGreaterThanOrEqual(0);
    expect(quietIndex).toBeGreaterThanOrEqual(0);
    expect(scoredIndex).toBeLessThan(quietIndex);
    expect(posts[scoredIndex]?.isTrending).toBe(true);
    expect(posts[quietIndex]?.isTrending).toBe(false);
  });

  it("keeps engagement-based personalization for for_you even when nothing has been scored yet", async () => {
    const engagedCreator = await createCreator("Fallback Engaged Muse", "fallback-engaged-creator");
    const otherCreator = await createCreator("Fallback Other Muse", "fallback-other-creator");
    const viewer = await createCreator(
      "Fallback Personalize Viewer",
      "fallback-personalize-viewer",
    );

    const engagedLook = await createLook(engagedCreator.id, "Fallback engaged drop");
    await prisma.creatorLookSave.create({
      data: { creatorLookId: engagedLook.id, userId: viewer.id },
    });
    const otherLook = await createLook(otherCreator.id, "Fallback unrelated drop");

    const response = await request(testApp)
      .get("/api/creator-looks/feed")
      .query({ tab: "for_you", limit: 30 })
      .set("Authorization", authHeaderFor(viewer.id));

    expect(response.status).toBe(200);
    const posts = response.body.data.posts as { id: string; isTrending: boolean }[];
    const engagedIndex = posts.findIndex((post) => post.id === engagedLook.id);
    const otherIndex = posts.findIndex((post) => post.id === otherLook.id);

    expect(engagedIndex).toBeGreaterThanOrEqual(0);
    expect(otherIndex).toBeGreaterThanOrEqual(0);
    expect(engagedIndex).toBeLessThan(otherIndex);
    expect(posts.every((post) => !post.isTrending)).toBe(true);
  });

  it("gives anonymous for_you its own creator-diversity-capped ranking instead of mirroring the trending tab", async () => {
    const busyCreator = await createCreator("Anon Busy Muse", "anon-busy-creator");
    const engager = await createCreator("Anon Diversity Engager", "anon-diversity-engager");

    const busyLooks = await Promise.all(
      Array.from({ length: 5 }, (_, index) =>
        createLook(busyCreator.id, `Anon busy drop ${index}`),
      ),
    );
    for (const look of busyLooks) {
      await prisma.creatorLookLike.create({ data: { creatorLookId: look.id, userId: engager.id } });
    }

    await creatorLookService.runTrendingAggregation();
    const { ranked } = await creatorLookService.runTrendingScoring();
    expect(ranked.length).toBeGreaterThanOrEqual(5);

    const trendingResponse = await request(testApp)
      .get("/api/creator-looks/feed")
      .query({ tab: "trending", limit: 30 });
    const trendingBusyCount = trendingResponse.body.data.posts.filter(
      (post: { creator: { id: string } }) => post.creator.id === busyCreator.id,
    ).length;
    expect(trendingBusyCount).toBe(5);

    const forYouResponse = await request(testApp)
      .get("/api/creator-looks/feed")
      .query({ tab: "for_you", limit: 30 });
    const forYouBusyCount = forYouResponse.body.data.posts.filter(
      (post: { creator: { id: string } }) => post.creator.id === busyCreator.id,
    ).length;
    expect(forYouBusyCount).toBeLessThanOrEqual(3);
    expect(forYouBusyCount).toBeLessThan(trendingBusyCount);
  });
});

describe("creatorLookService.countNewSince", () => {
  it("returns 0 for the following tab when the caller is anonymous", async () => {
    const count = await creatorLookService.countNewSince(undefined, {
      tab: "following",
      since: new Date(0),
    });

    expect(count).toBe(0);
  });

  it("returns 0 for the following tab when the viewer follows nobody", async () => {
    const viewer = await createCreator("Count New Viewer", "count-new-viewer");

    const count = await creatorLookService.countNewSince(viewer.id, {
      tab: "following",
      since: new Date(0),
    });

    expect(count).toBe(0);
  });

  it("counts new drops from followed muses", async () => {
    const followedCreator = await createCreator("Count Followed Muse", "count-followed-creator");
    const viewer = await createCreator("Count Following Viewer", "count-following-viewer");
    await followCreator(viewer.id, followedCreator.id);
    await createLook(followedCreator.id, "New since drop");

    const count = await creatorLookService.countNewSince(viewer.id, {
      tab: "following",
      since: new Date(Date.now() - 60 * 60 * 1000),
    });

    expect(count).toBeGreaterThan(0);
  });

  it("counts new drops for the trending and for_you tabs", async () => {
    const creator = await createCreator("Count Trending Muse", "count-trending-creator");
    await createLook(creator.id, "Trending count drop");

    const since = new Date(Date.now() - 60 * 60 * 1000);
    const trendingCount = await creatorLookService.countNewSince(undefined, {
      tab: "trending",
      since,
    });
    const forYouCount = await creatorLookService.countNewSince(undefined, {
      tab: "for_you",
      since,
    });

    expect(trendingCount).toBeGreaterThan(0);
    expect(forYouCount).toBeGreaterThan(0);
  });

  it("counts new drops for an arbitrary hashtag tab", async () => {
    const creator = await createCreator("Count Hashtag Muse", "count-hashtag-creator");
    const marker = randomUUID().slice(0, 6);
    const look = await createLook(creator.id, `Count hashtag drop #counttag${marker}`);
    await prisma.creatorLookHashtag.create({
      data: { creatorLookId: look.id, tag: `counttag${marker}` },
    });

    const count = await creatorLookService.countNewSince(undefined, {
      tab: `counttag${marker}`,
      since: new Date(Date.now() - 60 * 60 * 1000),
    });

    expect(count).toBe(1);
  });
});

describe("creatorLookService trending pipeline", () => {
  it("aggregates hourly drop metrics and prunes buckets older than the retention window", async () => {
    const creator = await createCreator("Pipeline Drop Muse", "pipeline-post-creator");
    const viewer = await createCreator("Pipeline Drop Viewer", "pipeline-post-viewer");
    const look = await createLook(creator.id, "Pipeline aggregation drop");
    await prisma.creatorLookLike.create({ data: { creatorLookId: look.id, userId: viewer.id } });

    const { bucketStart, deletedBuckets } = await creatorLookService.runTrendingAggregation();

    expect(bucketStart).toBeInstanceOf(Date);
    expect(deletedBuckets).toBeGreaterThanOrEqual(0);

    const stored = await prisma.creatorLookTrendMetric.findFirst({
      where: { creatorLookId: look.id },
    });
    expect(stored?.likes).toBe(1);
  });

  it("computes and caches ranked trending scores", async () => {
    const creator = await createCreator("Pipeline Score Muse", "pipeline-score-creator");
    const viewer = await createCreator("Pipeline Score Viewer", "pipeline-score-viewer");
    const look = await createLook(creator.id, "Pipeline scoring drop");
    await prisma.creatorLookLike.create({ data: { creatorLookId: look.id, userId: viewer.id } });
    await creatorLookService.runTrendingAggregation();

    const { ranked } = await creatorLookService.runTrendingScoring();

    expect(ranked.some((entry) => entry.lookId === look.id)).toBe(true);
  });

  it("breaks a tie between equally-scored drops the same way on every recompute", async () => {
    const creator = await createCreator("Pipeline Tie Muse", "pipeline-tie-creator");
    const viewerOne = await createCreator("Pipeline Tie Viewer One", "pipeline-tie-viewer-one");
    const viewerTwo = await createCreator("Pipeline Tie Viewer Two", "pipeline-tie-viewer-two");
    const lookA = await createLook(creator.id, "Pipeline tie drop A");
    const lookB = await createLook(creator.id, "Pipeline tie drop B");
    await prisma.creatorLookLike.createMany({
      data: [
        { creatorLookId: lookA.id, userId: viewerOne.id },
        { creatorLookId: lookA.id, userId: viewerTwo.id },
        { creatorLookId: lookB.id, userId: viewerOne.id },
        { creatorLookId: lookB.id, userId: viewerTwo.id },
      ],
    });
    await creatorLookService.runTrendingAggregation();

    const firstRun = await creatorLookService.runTrendingScoring();
    const secondRun = await creatorLookService.runTrendingScoring();

    const rankOf = (ranked: typeof firstRun.ranked, lookId: string) =>
      ranked.findIndex((entry) => entry.lookId === lookId);

    const firstScoreA = firstRun.ranked[rankOf(firstRun.ranked, lookA.id)]?.score;
    const firstScoreB = firstRun.ranked[rankOf(firstRun.ranked, lookB.id)]?.score;
    expect(firstScoreA).toBe(firstScoreB);

    const firstRunAWinsTie = rankOf(firstRun.ranked, lookA.id) < rankOf(firstRun.ranked, lookB.id);
    const secondRunAWinsTie =
      rankOf(secondRun.ranked, lookA.id) < rankOf(secondRun.ranked, lookB.id);
    expect(secondRunAWinsTie).toBe(firstRunAWinsTie);
  });

  it("finalizes an hour's bucket with activity that arrives after aggregation has already moved on to the next hour", async () => {
    const creator = await createCreator("Boundary Muse", "boundary-creator");
    const engagerA = await createCreator("Boundary Engager A", "boundary-engager-a");
    const engagerB = await createCreator("Boundary Engager B", "boundary-engager-b");
    const look = await createLook(creator.id, "Boundary gap drop");

    const hourOneStart = truncateToHour(new Date(Date.now() - 2 * 60 * 60 * 1000));
    const hourTwoStart = new Date(hourOneStart.getTime() + 60 * 60 * 1000);

    await prisma.creatorLookLike.create({
      data: {
        creatorLookId: look.id,
        userId: engagerA.id,
        createdAt: new Date(hourOneStart.getTime() + 10 * 60 * 1000),
      },
    });
    await creatorLookRepository.upsertHourlyPostMetrics(hourOneStart);

    await prisma.creatorLookLike.create({
      data: {
        creatorLookId: look.id,
        userId: engagerB.id,
        createdAt: new Date(hourOneStart.getTime() + 50 * 60 * 1000),
      },
    });
    await creatorLookRepository.upsertHourlyPostMetrics(hourTwoStart);

    const hourOneBucket = await prisma.creatorLookTrendMetric.findUnique({
      where: { creatorLookId_bucketStart: { creatorLookId: look.id, bucketStart: hourOneStart } },
    });
    const hourTwoBucket = await prisma.creatorLookTrendMetric.findUnique({
      where: { creatorLookId_bucketStart: { creatorLookId: look.id, bucketStart: hourTwoStart } },
    });
    const totalCountedLikes = (hourOneBucket?.likes ?? 0) + (hourTwoBucket?.likes ?? 0);

    expect(totalCountedLikes).toBe(2);
  });

  it("caches an empty scoring result with a short TTL instead of the normal long-lived one", async () => {
    const { ranked } = await creatorLookService.runTrendingScoring();
    expect(ranked).toHaveLength(0);

    const ttl = await redis.ttl(redisKeys.cache("explore-trending-score", "global"));
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(90);
  });

  it("caches a non-empty scoring result with the normal long-lived TTL", async () => {
    const creator = await createCreator("TTL Muse", "ttl-creator");
    const viewer = await createCreator("TTL Viewer", "ttl-viewer");
    const look = await createLook(creator.id, "TTL drop");
    await prisma.creatorLookLike.create({ data: { creatorLookId: look.id, userId: viewer.id } });
    await creatorLookService.runTrendingAggregation();

    const { ranked } = await creatorLookService.runTrendingScoring();
    expect(ranked.length).toBeGreaterThan(0);

    const ttl = await redis.ttl(redisKeys.cache("explore-trending-score", "global"));
    expect(ttl).toBeGreaterThan(90);
  });
});

describe("GET /api/creators/by-handle/:handle/looks integration with feed", () => {
  it("hydrates a muse's public drop list with tagged products and hashtags", async () => {
    const creator = await createCreator("Handle Feed Muse", "handle-feed-creator");
    const product = await createApprovedProduct("Handle Feed Product");
    const look = await createLook(creator.id, "Handle feed #style drop");
    await tagProduct(look.id, product.id);
    await prisma.creatorLookHashtag.create({ data: { creatorLookId: look.id, tag: "style" } });

    const response = await request(testApp).get(`/api/creators/by-handle/${creator.handle}/looks`);

    expect(response.status).toBe(200);
    expect(response.body.data.posts[0]).toMatchObject({
      id: look.id,
      hashtags: ["style"],
    });
    expect(response.body.data.posts[0].taggedProducts).toHaveLength(1);
  });
});

describe("GET and POST /api/creator-looks/:lookId/comments/:commentId/replies", () => {
  const postComment = async (lookId: string, userId: string, body: string) => {
    const response = await request(testApp)
      .post(`/api/creator-looks/${lookId}/comments`)
      .set("Authorization", authHeaderFor(userId))
      .send({ body });
    return response.body.data.id as string;
  };

  it("adds a reply, increments the parent's reply count, and the look's comment count", async () => {
    const creator = await createCreator("Reply Target Muse", "reply-target-creator");
    const commenter = await createCreator("Reply Thread Starter", "reply-thread-starter");
    const replier = await createCreator("Reply Author", "reply-author");
    const look = await createLook(creator.id, "Reply target drop");
    const commentId = await postComment(look.id, commenter.id, "Great fit!");

    const response = await request(testApp)
      .post(`/api/creator-looks/${look.id}/comments/${commentId}/replies`)
      .set("Authorization", authHeaderFor(replier.id))
      .send({ body: "Totally agree!" });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      parentCommentId: commentId,
      body: "Totally agree!",
      userId: replier.id,
    });

    const parentComment = await prisma.creatorLookComment.findUniqueOrThrow({
      where: { id: commentId },
    });
    expect(parentComment.replyCount).toBe(1);

    const stored = await prisma.creatorLook.findUniqueOrThrow({ where: { id: look.id } });
    expect(stored.commentCount).toBe(2);
  });

  it("surfaces reply count and a preview of replies when listing top-level comments", async () => {
    const creator = await createCreator("Preview Reply Muse", "preview-reply-creator");
    const commenter = await createCreator("Preview Reply Commenter", "preview-reply-commenter");
    const replier = await createCreator("Preview Reply Replier", "preview-reply-replier");
    const look = await createLook(creator.id, "Preview reply target");
    const commentId = await postComment(look.id, commenter.id, "Nice look");

    await request(testApp)
      .post(`/api/creator-looks/${look.id}/comments/${commentId}/replies`)
      .set("Authorization", authHeaderFor(replier.id))
      .send({ body: "First reply" });

    const response = await request(testApp).get(`/api/creator-looks/${look.id}/comments`);

    expect(response.status).toBe(200);
    const comment = response.body.data.comments[0];
    expect(comment.replyCount).toBe(1);
    expect(comment.previewReplies).toHaveLength(1);
    expect(comment.previewReplies[0]).toMatchObject({
      body: "First reply",
      parentCommentId: commentId,
    });
  });

  it("lists replies oldest first with cursor pagination", async () => {
    const creator = await createCreator("Reply List Muse", "reply-list-creator");
    const commenter = await createCreator("Reply List Commenter", "reply-list-commenter");
    const replier = await createCreator("Reply List Replier", "reply-list-replier");
    const look = await createLook(creator.id, "Reply list target");
    const commentId = await postComment(look.id, commenter.id, "Original comment");

    await request(testApp)
      .post(`/api/creator-looks/${look.id}/comments/${commentId}/replies`)
      .set("Authorization", authHeaderFor(replier.id))
      .send({ body: "First reply" });
    await request(testApp)
      .post(`/api/creator-looks/${look.id}/comments/${commentId}/replies`)
      .set("Authorization", authHeaderFor(replier.id))
      .send({ body: "Second reply" });

    const first = await request(testApp)
      .get(`/api/creator-looks/${look.id}/comments/${commentId}/replies`)
      .query({ limit: 1 });

    expect(first.status).toBe(200);
    expect(first.body.data.replies[0].body).toBe("First reply");
    expect(first.body.data.nextCursor).not.toBeNull();

    const second = await request(testApp)
      .get(`/api/creator-looks/${look.id}/comments/${commentId}/replies`)
      .query({ limit: 1, cursor: first.body.data.nextCursor });

    expect(second.status).toBe(200);
    expect(second.body.data.replies[0].body).toBe("Second reply");
  });

  it("rejects replying to a reply, keeping threads exactly one level deep", async () => {
    const creator = await createCreator("Nested Reply Muse", "nested-reply-creator");
    const commenter = await createCreator("Nested Reply Commenter", "nested-reply-commenter");
    const replier = await createCreator("Nested Reply Replier", "nested-reply-replier");
    const nestedReplier = await createCreator("Nested Reply Second", "nested-reply-second");
    const look = await createLook(creator.id, "Nested reply target");
    const commentId = await postComment(look.id, commenter.id, "Top-level comment");

    const replyResponse = await request(testApp)
      .post(`/api/creator-looks/${look.id}/comments/${commentId}/replies`)
      .set("Authorization", authHeaderFor(replier.id))
      .send({ body: "A reply" });
    const replyId = replyResponse.body.data.id as string;

    const nestedResponse = await request(testApp)
      .post(`/api/creator-looks/${look.id}/comments/${replyId}/replies`)
      .set("Authorization", authHeaderFor(nestedReplier.id))
      .send({ body: "A reply to a reply" });

    expect(nestedResponse.status).toBe(422);
  });

  it("returns 404 replying to a comment that doesn't exist", async () => {
    const creator = await createCreator("Missing Reply Muse", "missing-reply-creator");
    const replier = await createCreator("Missing Reply Author", "missing-reply-author");
    const look = await createLook(creator.id, "Missing reply target");

    const response = await request(testApp)
      .post(`/api/creator-looks/${look.id}/comments/${randomUUID()}/replies`)
      .set("Authorization", authHeaderFor(replier.id))
      .send({ body: "Ghost reply" });

    expect(response.status).toBe(404);
  });

  it("returns 404 listing replies for a comment that doesn't exist", async () => {
    const creator = await createCreator("Missing Reply List Muse", "missing-reply-list-creator");
    const look = await createLook(creator.id, "Missing reply list target");

    const response = await request(testApp).get(
      `/api/creator-looks/${look.id}/comments/${randomUUID()}/replies`,
    );

    expect(response.status).toBe(404);
  });

  it("requires authentication to reply", async () => {
    const creator = await createCreator("Auth Reply Muse", "auth-reply-creator");
    const commenter = await createCreator("Auth Reply Commenter", "auth-reply-commenter");
    const look = await createLook(creator.id, "Needs auth to reply");
    const commentId = await postComment(look.id, commenter.id, "Needs a reply");

    const response = await request(testApp)
      .post(`/api/creator-looks/${look.id}/comments/${commentId}/replies`)
      .send({ body: "Anonymous reply" });

    expect(response.status).toBe(401);
  });

  it("rejects an empty reply body", async () => {
    const creator = await createCreator("Empty Reply Muse", "empty-reply-creator");
    const commenter = await createCreator("Empty Reply Commenter", "empty-reply-commenter");
    const replier = await createCreator("Empty Reply Author", "empty-reply-author");
    const look = await createLook(creator.id, "Empty reply target");
    const commentId = await postComment(look.id, commenter.id, "Needs a reply");

    const response = await request(testApp)
      .post(`/api/creator-looks/${look.id}/comments/${commentId}/replies`)
      .set("Authorization", authHeaderFor(replier.id))
      .send({ body: "" });

    expect(response.status).toBe(422);
  });
});
