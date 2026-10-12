import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { platformSettingsService } from "#modules/platform-settings/platform-settings.service.js";
import { redis } from "#redis/redis.client.js";
import {
  authHeaderFor,
  createApprovedProduct,
  createCreator,
  createLook,
  tagProduct,
} from "#test/integration/creator-look-fixtures.js";
import { testApp } from "#test/integration/test-app.js";

beforeEach(async () => {
  await redis.flushdb();
  platformSettingsService.invalidate();
});

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
