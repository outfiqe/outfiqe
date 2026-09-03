import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import {
  CreatorStatus,
  FollowTargetType,
  ProductStatus,
  UserRole,
} from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { creatorLookService } from "#modules/creator-looks/creatorLook.service.js";
import { redis } from "#redis/redis.client.js";
import { ensureProductType } from "#test/integration/productFixtures.js";
import { testApp } from "#test/integration/testApp.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

beforeEach(async () => {
  await redis.flushdb();
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

const tagProduct = async (lookId: string, productId: string, sizeWorn = "M") =>
  prisma.creatorLookProduct.create({ data: { creatorLookId: lookId, productId, sizeWorn } });

const followCreator = async (followerId: string, creatorId: string) =>
  prisma.follow.create({
    data: { followerId, followingType: FollowTargetType.USER, followingId: creatorId },
  });

const authHeaderFor = (userId: string, role: UserRole = UserRole.CUSTOMER) => {
  const { accessToken } = generateTokenpair({ sub: userId, role });
  return `Bearer ${accessToken}`;
};

describe("GET /api/creator-looks/autocomplete", () => {
  it("returns posts matching the caption, hydrated with creator info", async () => {
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
    const creator = await createCreator("Repeat Query Creator", "repeat-query-creator");
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

  it("matches by the post's creator name, not just the caption", async () => {
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
    const creator = await createCreator("Post Creator", "post-creator");
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
    const creator = await createCreator("Captionless Creator", "captionless-creator");

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

  it("rejects a non-approved creator", async () => {
    const plainUser = await createPlainUser("Not A Creator", "post-not-a-creator");

    const response = await request(testApp)
      .post("/api/creator-looks")
      .set("Authorization", authHeaderFor(plainUser.id))
      .send({
        imageUrls: ["https://cdn.outfiqe.test/a.jpg"],
        taggedProducts: [],
      });

    expect(response.status).toBe(403);
  });

  it("rejects tagging a product that isn't approved", async () => {
    const creator = await createCreator("Rejected Tag Creator", "rejected-tag-creator");
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
    const creator = await createCreator("Nonexistent Tag Creator", "nonexistent-tag-creator");

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

  it("rejects an empty imageUrls array", async () => {
    const creator = await createCreator("Empty Images Creator", "empty-images-creator");

    const response = await request(testApp)
      .post("/api/creator-looks")
      .set("Authorization", authHeaderFor(creator.id))
      .send({ imageUrls: [], taggedProducts: [] });

    expect(response.status).toBe(422);
  });
});

describe("GET /api/creator-looks/:lookId", () => {
  it("returns the owner's own post detail", async () => {
    const creator = await createCreator("Owner Getter", "owner-getter");
    const product = await createApprovedProduct("Getter Boots");
    const look = await createLook(creator.id, "My own post");
    await tagProduct(look.id, product.id);

    const response = await request(testApp)
      .get(`/api/creator-looks/${look.id}`)
      .set("Authorization", authHeaderFor(creator.id));

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(look.id);
    expect(response.body.data.taggedProducts).toHaveLength(1);
  });

  it("returns 404 for a post owned by someone else", async () => {
    const owner = await createCreator("Real Owner", "real-owner");
    const outsider = await createCreator("Outsider Viewer", "outsider-viewer");
    const look = await createLook(owner.id, "Not yours");

    const response = await request(testApp)
      .get(`/api/creator-looks/${look.id}`)
      .set("Authorization", authHeaderFor(outsider.id));

    expect(response.status).toBe(404);
  });

  it("returns 404 for a nonexistent post", async () => {
    const creator = await createCreator("Missing Post Viewer", "missing-post-viewer");

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
  it("returns a post for any viewer, not just the owner", async () => {
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
    const look = await createLook(creator.id, "Liked post");

    await request(testApp)
      .post(`/api/creator-looks/${look.id}/like`)
      .set("Authorization", authHeaderFor(liker.id));

    const response = await request(testApp)
      .get(`/api/creator-looks/${look.id}/public`)
      .set("Authorization", authHeaderFor(liker.id));

    expect(response.status).toBe(200);
    expect(response.body.data.isLiked).toBe(true);
  });

  it("returns 404 for a nonexistent post", async () => {
    const response = await request(testApp).get(`/api/creator-looks/${randomUUID()}/public`);

    expect(response.status).toBe(404);
  });
});

describe("PATCH /api/creator-looks/:lookId", () => {
  it("updates a post's images, caption, and tagged products", async () => {
    const creator = await createCreator("Update Creator", "update-creator");
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
    const creator = await createCreator("Caption Clear Creator", "caption-clear-creator");
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

  it("returns 404 for a post owned by someone else", async () => {
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
    const creator = await createCreator("Update Reject Creator", "update-reject-creator");
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
  it("soft-deletes the owner's post", async () => {
    const creator = await createCreator("Delete Creator", "delete-creator");
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

  it("returns 404 for a post owned by someone else", async () => {
    const owner = await createCreator("Delete Real Owner", "delete-real-owner");
    const outsider = await createCreator("Delete Outsider", "delete-outsider");
    const look = await createLook(owner.id, "Protected from deletion");

    const response = await request(testApp)
      .delete(`/api/creator-looks/${look.id}`)
      .set("Authorization", authHeaderFor(outsider.id));

    expect(response.status).toBe(404);
  });

  it("requires authentication", async () => {
    const response = await request(testApp).delete(`/api/creator-looks/${randomUUID()}`);

    expect(response.status).toBe(401);
  });
});

describe("GET /api/creator-looks/saved", () => {
  it("lists the caller's saved looks, most recently saved first, with cursor pagination", async () => {
    const creator = await createCreator("Saved List Creator", "saved-list-creator");
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
    const creator = await createCreator("Featured Creator", "featured-creator");
    const product = await createApprovedProduct("Featured Blazer");
    const look = await createLook(creator.id, "Featured post");
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
    const creator = await createCreator("Featured Page Creator", "featured-page-creator");
    const viewer = await createCreator("Featured Page Viewer", "featured-page-viewer");
    const productOne = await createApprovedProduct("Featured Page Product One");
    const productTwo = await createApprovedProduct("Featured Page Product Two");
    const lookOne = await createLook(creator.id, "Featured page post one");
    const lookTwo = await createLook(creator.id, "Featured page post two");
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
  it("returns matching posts with a total count", async () => {
    const creator = await createCreator("Search Post Creator", "search-post-creator");
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
    const creator = await createCreator("Search Like Creator", "search-like-creator");
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
    const creator = await createCreator("Search Page Creator", "search-page-creator");
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
    const creator = await createCreator("Trending Tag Creator", "trending-tag-creator");
    const marker = randomUUID().slice(0, 6);
    const look = await createLook(creator.id, `Post about #trendtag${marker}`);
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
    const creator = await createCreator("Ranked Tag Creator", "ranked-tag-creator");
    const marker = randomUUID().slice(0, 6);
    const look = await createLook(creator.id, `Ranked pipeline post #rankedtag${marker}`);
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

describe("POST /api/creator-looks/:lookId/like and unlike", () => {
  it("likes a post and increments the like count", async () => {
    const creator = await createCreator("Like Target Creator", "like-target-creator");
    const viewer = await createCreator("Like Actor", "like-actor");
    const look = await createLook(creator.id, "Likeable post");

    const response = await request(testApp)
      .post(`/api/creator-looks/${look.id}/like`)
      .set("Authorization", authHeaderFor(viewer.id));

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ liked: true, likeCount: 1 });
  });

  it("is idempotent when liking the same post twice", async () => {
    const creator = await createCreator("Idempotent Like Creator", "idempotent-like-creator");
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

  it("unlikes a previously liked post and decrements the count", async () => {
    const creator = await createCreator("Unlike Target Creator", "unlike-target-creator");
    const viewer = await createCreator("Unlike Actor", "unlike-actor");
    const look = await createLook(creator.id, "Unlikeable post");

    await request(testApp)
      .post(`/api/creator-looks/${look.id}/like`)
      .set("Authorization", authHeaderFor(viewer.id));
    const response = await request(testApp)
      .delete(`/api/creator-looks/${look.id}/like`)
      .set("Authorization", authHeaderFor(viewer.id));

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ liked: false, likeCount: 0 });
  });

  it("is a no-op unliking a post that was never liked", async () => {
    const creator = await createCreator("Noop Unlike Creator", "noop-unlike-creator");
    const viewer = await createCreator("Noop Unlike Actor", "noop-unlike-actor");
    const look = await createLook(creator.id, "Never liked");

    const response = await request(testApp)
      .delete(`/api/creator-looks/${look.id}/like`)
      .set("Authorization", authHeaderFor(viewer.id));

    expect(response.status).toBe(200);
    expect(response.body.data.likeCount).toBe(0);
  });

  it("returns 404 liking a post that doesn't exist", async () => {
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
});

describe("POST /api/creator-looks/:lookId/save and unsave", () => {
  it("saves a post and increments the save count", async () => {
    const creator = await createCreator("Save Target Creator", "save-target-creator");
    const viewer = await createCreator("Save Actor", "save-actor");
    const look = await createLook(creator.id, "Saveable post");

    const response = await request(testApp)
      .post(`/api/creator-looks/${look.id}/save`)
      .set("Authorization", authHeaderFor(viewer.id));

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ saved: true, saveCount: 1 });
  });

  it("is idempotent when saving the same post twice", async () => {
    const creator = await createCreator("Idempotent Save Creator", "idempotent-save-creator");
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

  it("unsaves a previously saved post and decrements the count", async () => {
    const creator = await createCreator("Unsave Target Creator", "unsave-target-creator");
    const viewer = await createCreator("Unsave Actor", "unsave-actor");
    const look = await createLook(creator.id, "Unsaveable post");

    await request(testApp)
      .post(`/api/creator-looks/${look.id}/save`)
      .set("Authorization", authHeaderFor(viewer.id));
    const response = await request(testApp)
      .delete(`/api/creator-looks/${look.id}/save`)
      .set("Authorization", authHeaderFor(viewer.id));

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ saved: false, saveCount: 0 });
  });

  it("is a no-op unsaving a post that was never saved", async () => {
    const creator = await createCreator("Noop Unsave Creator", "noop-unsave-creator");
    const viewer = await createCreator("Noop Unsave Actor", "noop-unsave-actor");
    const look = await createLook(creator.id, "Never saved");

    const response = await request(testApp)
      .delete(`/api/creator-looks/${look.id}/save`)
      .set("Authorization", authHeaderFor(viewer.id));

    expect(response.status).toBe(200);
    expect(response.body.data.saveCount).toBe(0);
  });

  it("returns 404 saving a post that doesn't exist", async () => {
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
});

describe("GET and POST /api/creator-looks/:lookId/comments", () => {
  it("adds a comment and increments the comment count", async () => {
    const creator = await createCreator("Comment Target Creator", "comment-target-creator");
    const commenter = await createCreator("Commenter", "commenter");
    const look = await createLook(creator.id, "Commentable post");

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
    const creator = await createCreator("Comment List Creator", "comment-list-creator");
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
    const creator = await createCreator("Empty Comments Creator", "empty-comments-creator");
    const look = await createLook(creator.id, "No comments yet");

    const response = await request(testApp).get(`/api/creator-looks/${look.id}/comments`);

    expect(response.status).toBe(200);
    expect(response.body.data.comments).toEqual([]);
  });

  it("returns 404 commenting on a post that doesn't exist", async () => {
    const commenter = await createCreator("Missing Comment Actor", "missing-comment-actor");

    const response = await request(testApp)
      .post(`/api/creator-looks/${randomUUID()}/comments`)
      .set("Authorization", authHeaderFor(commenter.id))
      .send({ body: "Ghost comment" });

    expect(response.status).toBe(404);
  });

  it("returns 404 listing comments on a post that doesn't exist", async () => {
    const response = await request(testApp).get(`/api/creator-looks/${randomUUID()}/comments`);

    expect(response.status).toBe(404);
  });

  it("requires authentication to comment", async () => {
    const creator = await createCreator("Auth Comment Creator", "auth-comment-creator");
    const look = await createLook(creator.id, "Needs auth to comment");

    const response = await request(testApp)
      .post(`/api/creator-looks/${look.id}/comments`)
      .send({ body: "Anonymous comment" });

    expect(response.status).toBe(401);
  });

  it("rejects an empty comment body", async () => {
    const creator = await createCreator("Empty Body Creator", "empty-body-creator");
    const commenter = await createCreator("Empty Body Commenter", "empty-body-commenter");
    const look = await createLook(creator.id, "Empty body target");

    const response = await request(testApp)
      .post(`/api/creator-looks/${look.id}/comments`)
      .set("Authorization", authHeaderFor(commenter.id))
      .send({ body: "" });

    expect(response.status).toBe(422);
  });
});

describe("POST /api/creator-looks/:lookId/tags/:productId/click", () => {
  it("records a tag click for an anonymous viewer", async () => {
    const creator = await createCreator("Tag Click Creator", "tag-click-creator");
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
    const creator = await createCreator("Auth Tag Click Creator", "auth-tag-click-creator");
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

  it("returns 404 for a post that doesn't exist", async () => {
    const response = await request(testApp)
      .post(`/api/creator-looks/${randomUUID()}/tags/${randomUUID()}/click`)
      .send({ sessionId: randomUUID() });

    expect(response.status).toBe(404);
  });

  it("returns 404 when the product isn't tagged in this look", async () => {
    const creator = await createCreator("Untagged Click Creator", "untagged-click-creator");
    const product = await createApprovedProduct("Untagged Product");
    const look = await createLook(creator.id, "No tags here");

    const response = await request(testApp)
      .post(`/api/creator-looks/${look.id}/tags/${product.id}/click`)
      .send({ sessionId: randomUUID() });

    expect(response.status).toBe(404);
  });

  it("rejects a missing sessionId", async () => {
    const creator = await createCreator("Missing Session Creator", "missing-session-creator");
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
    const creator = await createCreator("Feed Default Creator", "feed-default-creator");
    await createLook(creator.id, "Default feed post");

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

  it("falls back to trending when the viewer follows nobody on the following tab", async () => {
    const viewer = await createCreator("No Follows Viewer", "no-follows-viewer");

    const response = await request(testApp)
      .get("/api/creator-looks/feed")
      .query({ tab: "following" })
      .set("Authorization", authHeaderFor(viewer.id));

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty("posts");
  });

  it("restricts the following tab to posts from followed creators", async () => {
    const followedCreator = await createCreator("Followed Creator", "followed-creator");
    const unfollowedCreator = await createCreator("Unfollowed Creator", "unfollowed-creator");
    const viewer = await createCreator("Following Tab Viewer", "following-tab-viewer");
    const followedLook = await createLook(followedCreator.id, "From a followed creator");
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
    const followedCreator = await createCreator("Paged Followed Creator", "paged-followed-creator");
    const viewer = await createCreator("Paged Following Viewer", "paged-following-viewer");
    const lookOne = await createLook(followedCreator.id, "Paged following post one");
    const lookTwo = await createLook(followedCreator.id, "Paged following post two");
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

  it("filters the feed by an arbitrary hashtag tab", async () => {
    const creator = await createCreator("Hashtag Tab Creator", "hashtag-tab-creator");
    const marker = randomUUID().slice(0, 6);
    const look = await createLook(creator.id, `Tagged post #feedtag${marker}`);
    await prisma.creatorLookHashtag.create({
      data: { creatorLookId: look.id, tag: `feedtag${marker}` },
    });

    const response = await request(testApp)
      .get("/api/creator-looks/feed")
      .query({ tab: `feedtag${marker}` });

    expect(response.status).toBe(200);
    expect(response.body.data.posts.map((post: { id: string }) => post.id)).toEqual([look.id]);
  });

  it("personalizes the for_you tab once the trending pipeline has scored posts, applying follow, engagement, and hashtag boosts with a per-creator diversity cap", async () => {
    const busyCreator = await createCreator("Busy Creator", "busy-creator");
    const followedCreator = await createCreator(
      "Boosted Followed Creator",
      "boosted-followed-creator",
    );
    const engagedCreator = await createCreator(
      "Boosted Engaged Creator",
      "boosted-engaged-creator",
    );
    const viewer = await createCreator("Personalized Viewer", "personalized-viewer");
    const marker = randomUUID().slice(0, 6);

    const busyLooks = await Promise.all(
      Array.from({ length: 4 }, (_, index) =>
        createLook(busyCreator.id, `Busy creator post ${index} #shared${marker}`),
      ),
    );
    const followedLook = await createLook(followedCreator.id, `Followed post #shared${marker}`);
    const engagedLook = await createLook(engagedCreator.id, `Engaged post #shared${marker}`);
    const unengagedCreator = await createCreator("Unengaged Creator", "unengaged-creator");
    const unengagedViewer = await createCreator("Unengaged Viewer", "unengaged-viewer");
    const unengagedLook = await createLook(
      unengagedCreator.id,
      `Unengaged post #different${marker}`,
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

  it("computes a fresh personalized score when nothing is cached yet", async () => {
    const creator = await createCreator("Fresh Score Creator", "fresh-score-creator");
    const viewer = await createCreator("Fresh Score Viewer", "fresh-score-viewer");
    const look = await createLook(creator.id, "Fresh score post");
    await prisma.creatorLookLike.create({ data: { creatorLookId: look.id, userId: viewer.id } });
    await creatorLookService.runTrendingAggregation();

    const response = await request(testApp)
      .get("/api/creator-looks/feed")
      .query({ tab: "for_you" })
      .set("Authorization", authHeaderFor(viewer.id));

    expect(response.status).toBe(200);
    expect(response.body.data.posts.some((post: { id: string }) => post.id === look.id)).toBe(true);
  });

  it("falls back to the legacy trending snapshot for an authenticated viewer when no post has ever scored", async () => {
    const creator = await createCreator("No Score Creator", "no-score-creator");
    const viewer = await createCreator("No Score Viewer", "no-score-viewer");
    await createLook(creator.id, "Never scored post");

    const response = await request(testApp)
      .get("/api/creator-looks/feed")
      .query({ tab: "for_you" })
      .set("Authorization", authHeaderFor(viewer.id));

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty("posts");
  });

  it("paginates the trending tab with a stable snapshot across pages", async () => {
    const creator = await createCreator("Trending Page Creator", "trending-page-creator");
    await createLook(creator.id, "Trending page post one");
    await createLook(creator.id, "Trending page post two");

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

  it("counts new posts from followed creators", async () => {
    const followedCreator = await createCreator("Count Followed Creator", "count-followed-creator");
    const viewer = await createCreator("Count Following Viewer", "count-following-viewer");
    await followCreator(viewer.id, followedCreator.id);
    await createLook(followedCreator.id, "New since post");

    const count = await creatorLookService.countNewSince(viewer.id, {
      tab: "following",
      since: new Date(Date.now() - 60 * 60 * 1000),
    });

    expect(count).toBeGreaterThan(0);
  });

  it("counts new posts for the trending and for_you tabs", async () => {
    const creator = await createCreator("Count Trending Creator", "count-trending-creator");
    await createLook(creator.id, "Trending count post");

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

  it("counts new posts for an arbitrary hashtag tab", async () => {
    const creator = await createCreator("Count Hashtag Creator", "count-hashtag-creator");
    const marker = randomUUID().slice(0, 6);
    const look = await createLook(creator.id, `Count hashtag post #counttag${marker}`);
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
  it("aggregates hourly post metrics and prunes buckets older than the retention window", async () => {
    const creator = await createCreator("Pipeline Post Creator", "pipeline-post-creator");
    const viewer = await createCreator("Pipeline Post Viewer", "pipeline-post-viewer");
    const look = await createLook(creator.id, "Pipeline aggregation post");
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
    const creator = await createCreator("Pipeline Score Creator", "pipeline-score-creator");
    const viewer = await createCreator("Pipeline Score Viewer", "pipeline-score-viewer");
    const look = await createLook(creator.id, "Pipeline scoring post");
    await prisma.creatorLookLike.create({ data: { creatorLookId: look.id, userId: viewer.id } });
    await creatorLookService.runTrendingAggregation();

    const { ranked } = await creatorLookService.runTrendingScoring();

    expect(ranked.some((entry) => entry.lookId === look.id)).toBe(true);
  });
});

describe("GET /api/creators/by-handle/:handle/looks integration with feed", () => {
  it("hydrates a creator's public post list with tagged products and hashtags", async () => {
    const creator = await createCreator("Handle Feed Creator", "handle-feed-creator");
    const product = await createApprovedProduct("Handle Feed Product");
    const look = await createLook(creator.id, "Handle feed #style post");
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
    const creator = await createCreator("Reply Target Creator", "reply-target-creator");
    const commenter = await createCreator("Reply Thread Starter", "reply-thread-starter");
    const replier = await createCreator("Reply Author", "reply-author");
    const look = await createLook(creator.id, "Reply target post");
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
    const creator = await createCreator("Preview Reply Creator", "preview-reply-creator");
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
    const creator = await createCreator("Reply List Creator", "reply-list-creator");
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
    const creator = await createCreator("Nested Reply Creator", "nested-reply-creator");
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
    const creator = await createCreator("Missing Reply Creator", "missing-reply-creator");
    const replier = await createCreator("Missing Reply Author", "missing-reply-author");
    const look = await createLook(creator.id, "Missing reply target");

    const response = await request(testApp)
      .post(`/api/creator-looks/${look.id}/comments/${randomUUID()}/replies`)
      .set("Authorization", authHeaderFor(replier.id))
      .send({ body: "Ghost reply" });

    expect(response.status).toBe(404);
  });

  it("returns 404 listing replies for a comment that doesn't exist", async () => {
    const creator = await createCreator("Missing Reply List Creator", "missing-reply-list-creator");
    const look = await createLook(creator.id, "Missing reply list target");

    const response = await request(testApp).get(
      `/api/creator-looks/${look.id}/comments/${randomUUID()}/replies`,
    );

    expect(response.status).toBe(404);
  });

  it("requires authentication to reply", async () => {
    const creator = await createCreator("Auth Reply Creator", "auth-reply-creator");
    const commenter = await createCreator("Auth Reply Commenter", "auth-reply-commenter");
    const look = await createLook(creator.id, "Needs auth to reply");
    const commentId = await postComment(look.id, commenter.id, "Needs a reply");

    const response = await request(testApp)
      .post(`/api/creator-looks/${look.id}/comments/${commentId}/replies`)
      .send({ body: "Anonymous reply" });

    expect(response.status).toBe(401);
  });

  it("rejects an empty reply body", async () => {
    const creator = await createCreator("Empty Reply Creator", "empty-reply-creator");
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
