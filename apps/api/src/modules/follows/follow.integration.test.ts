import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { FollowTargetType, UserRole } from "#generated/prisma/enums.js";
import { redis } from "#redis/redis.client.js";
import {
  authHeaderFor,
  createBrand,
  createCreator,
  createPlainUser,
  followUser,
} from "#test/integration/follow-fixtures.js";
import { testApp } from "#test/integration/test-app.js";

beforeEach(async () => {
  await redis.flushdb();
});

describe("POST /api/follows/:targetType/:targetId", () => {
  it("follows a user and increments both follower and following counts", async () => {
    const follower = await createPlainUser("Follow Actor", "follow-actor");
    const target = await createCreator("Follow Target", "follow-target");

    const response = await request(testApp)
      .post(`/api/follows/user/${target.id}`)
      .set("Authorization", authHeaderFor(follower.id));

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ following: true, followerCount: 1 });

    const updatedTarget = await prisma.user.findUniqueOrThrow({ where: { id: target.id } });
    const updatedFollower = await prisma.user.findUniqueOrThrow({ where: { id: follower.id } });
    expect(updatedTarget.followerCount).toBe(1);
    expect(updatedFollower.followingCount).toBe(1);
  });

  it("follows a brand and increments its follower count", async () => {
    const follower = await createPlainUser("Brand Follow Actor", "brand-follow-actor");
    const brand = await createBrand("Followable Brand");

    const response = await request(testApp)
      .post(`/api/follows/brand/${brand.id}`)
      .set("Authorization", authHeaderFor(follower.id));

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ following: true, followerCount: 1 });
  });

  it("is idempotent when following the same target twice", async () => {
    const follower = await createPlainUser("Idempotent Follower", "idempotent-follower");
    const target = await createCreator("Idempotent Target", "idempotent-target");

    await request(testApp)
      .post(`/api/follows/user/${target.id}`)
      .set("Authorization", authHeaderFor(follower.id));
    const second = await request(testApp)
      .post(`/api/follows/user/${target.id}`)
      .set("Authorization", authHeaderFor(follower.id));

    expect(second.status).toBe(200);
    expect(second.body.data.followerCount).toBe(1);
  });

  it("rejects following yourself", async () => {
    const user = await createPlainUser("Self Follower", "self-follower");

    const response = await request(testApp)
      .post(`/api/follows/user/${user.id}`)
      .set("Authorization", authHeaderFor(user.id));

    expect(response.status).toBe(400);
  });

  it("404s when the target doesn't exist", async () => {
    const follower = await createPlainUser("Missing Target Follower", "missing-target-follower");

    const response = await request(testApp)
      .post(`/api/follows/user/${randomUUID()}`)
      .set("Authorization", authHeaderFor(follower.id));

    expect(response.status).toBe(404);
  });

  it("requires authentication", async () => {
    const target = await createCreator("Auth Required Target", "auth-required-target");

    const response = await request(testApp).post(`/api/follows/user/${target.id}`);

    expect(response.status).toBe(401);
  });

  it("rejects a platform admin following a muse", async () => {
    const admin = await createPlainUser("Following Admin", "following-admin", UserRole.ADMIN);
    const target = await createCreator("Admin Follow Target", "admin-follow-target");

    const response = await request(testApp)
      .post(`/api/follows/user/${target.id}`)
      .set("Authorization", authHeaderFor(admin.id, UserRole.ADMIN));

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("ADMIN_CANNOT_FOLLOW");

    const updatedTarget = await prisma.user.findUniqueOrThrow({ where: { id: target.id } });
    expect(updatedTarget.followerCount).toBe(0);
  });
});

describe("DELETE /api/follows/:targetType/:targetId", () => {
  it("unfollows a previously-followed user and decrements both counts", async () => {
    const follower = await createPlainUser("Unfollow Actor", "unfollow-actor");
    const target = await createCreator("Unfollow Target", "unfollow-target");
    await followUser(follower.id, target.id);
    await prisma.user.update({ where: { id: target.id }, data: { followerCount: 1 } });
    await prisma.user.update({ where: { id: follower.id }, data: { followingCount: 1 } });

    const response = await request(testApp)
      .delete(`/api/follows/user/${target.id}`)
      .set("Authorization", authHeaderFor(follower.id));

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ following: false, followerCount: 0 });

    const updatedTarget = await prisma.user.findUniqueOrThrow({ where: { id: target.id } });
    expect(updatedTarget.followerCount).toBe(0);
  });

  it("is a no-op when not currently following the target", async () => {
    const follower = await createPlainUser("Noop Unfollower", "noop-unfollower");
    const target = await createCreator("Noop Unfollow Target", "noop-unfollow-target");

    const response = await request(testApp)
      .delete(`/api/follows/user/${target.id}`)
      .set("Authorization", authHeaderFor(follower.id));

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ following: false, followerCount: 0 });
  });

  it("404s when the target doesn't exist", async () => {
    const follower = await createPlainUser("Missing Unfollow Actor", "missing-unfollow-actor");

    const response = await request(testApp)
      .delete(`/api/follows/user/${randomUUID()}`)
      .set("Authorization", authHeaderFor(follower.id));

    expect(response.status).toBe(404);
  });

  it("requires authentication", async () => {
    const target = await createCreator("Auth Required Unfollow Target", "auth-required-unfollow");

    const response = await request(testApp).delete(`/api/follows/user/${target.id}`);

    expect(response.status).toBe(401);
  });
});

describe("GET /api/follows/:targetType/:targetId/followers", () => {
  it("lists a user's followers, newest first, with the viewer's own follow state", async () => {
    const target = await createCreator("Followers Target", "followers-target");
    const viewer = await createPlainUser("Followers Viewer", "followers-viewer");
    const olderFollower = await createPlainUser("Older Follower", "older-follower");
    const newerFollower = await createPlainUser("Newer Follower", "newer-follower");
    await followUser(olderFollower.id, target.id);
    await followUser(newerFollower.id, target.id);
    await followUser(viewer.id, olderFollower.id);

    const response = await request(testApp)
      .get(`/api/follows/user/${target.id}/followers`)
      .set("Authorization", authHeaderFor(viewer.id));

    expect(response.status).toBe(200);
    expect(response.body.data.items.map((item: { id: string }) => item.id)).toEqual([
      newerFollower.id,
      olderFollower.id,
    ]);
    const olderEntry = response.body.data.items.find(
      (item: { id: string }) => item.id === olderFollower.id,
    );
    expect(olderEntry.isFollowedByViewer).toBe(true);
    const newerEntry = response.body.data.items.find(
      (item: { id: string }) => item.id === newerFollower.id,
    );
    expect(newerEntry.isFollowedByViewer).toBe(false);
  });

  it("filters followers by search query", async () => {
    const target = await createCreator("Search Followers Target", "search-followers-target");
    const marker = randomUUID().slice(0, 8);
    const matching = await createPlainUser(`Zzyx ${marker}`, `zzyx-${marker}`);
    const nonMatching = await createPlainUser("Someone Else", "someone-else-follower");
    await followUser(matching.id, target.id);
    await followUser(nonMatching.id, target.id);

    const response = await request(testApp)
      .get(`/api/follows/user/${target.id}/followers`)
      .query({ q: marker });

    expect(response.status).toBe(200);
    expect(response.body.data.items).toHaveLength(1);
    expect(response.body.data.items[0].id).toBe(matching.id);
  });

  it("lists a brand's followers", async () => {
    const brand = await createBrand("Followers Brand");
    const follower = await createPlainUser("Brand Follower", "brand-follower");
    await prisma.follow.create({
      data: {
        followerId: follower.id,
        followingType: FollowTargetType.BRAND,
        followingId: brand.id,
      },
    });

    const response = await request(testApp).get(`/api/follows/brand/${brand.id}/followers`);

    expect(response.status).toBe(200);
    expect(response.body.data.items.map((item: { id: string }) => item.id)).toEqual([follower.id]);
  });

  it("404s when the target doesn't exist", async () => {
    const response = await request(testApp).get(`/api/follows/user/${randomUUID()}/followers`);
    expect(response.status).toBe(404);
  });

  it("works for an unauthenticated viewer, without isFollowedByViewer set", async () => {
    const target = await createCreator("Anon Followers Target", "anon-followers-target");
    const follower = await createPlainUser("Anon Follower", "anon-follower");
    await followUser(follower.id, target.id);

    const response = await request(testApp).get(`/api/follows/user/${target.id}/followers`);

    expect(response.status).toBe(200);
    expect(response.body.data.items[0].isFollowedByViewer).toBe(false);
  });
});

describe("GET /api/follows/user/:userId/following", () => {
  it("lists both followed users and followed brands together, newest first", async () => {
    const viewer = await createPlainUser("Following Viewer", "following-viewer");
    const followedUser = await createCreator("Followed User", "followed-user");
    const followedBrand = await createBrand("Followed Brand");
    await followUser(viewer.id, followedUser.id);
    await prisma.follow.create({
      data: {
        followerId: viewer.id,
        followingType: FollowTargetType.BRAND,
        followingId: followedBrand.id,
      },
    });

    const response = await request(testApp).get(`/api/follows/user/${viewer.id}/following`);

    expect(response.status).toBe(200);
    const ids: string[] = response.body.data.items.map((item: { id: string }) => item.id);
    expect(ids).toEqual([followedBrand.id, followedUser.id]);
  });

  it("filters following by search query", async () => {
    const viewer = await createPlainUser("Following Search Viewer", "following-search-viewer");
    const marker = randomUUID().slice(0, 8);
    const matching = await createCreator(`Zzyx ${marker}`, `zzyx-following-${marker}`);
    const nonMatching = await createCreator("Someone Else", "someone-else-following");
    await followUser(viewer.id, matching.id);
    await followUser(viewer.id, nonMatching.id);

    const response = await request(testApp)
      .get(`/api/follows/user/${viewer.id}/following`)
      .query({ q: marker });

    expect(response.status).toBe(200);
    expect(response.body.data.items).toHaveLength(1);
    expect(response.body.data.items[0].id).toBe(matching.id);
  });

  it("paginates through following with a stable cursor", async () => {
    const viewer = await createPlainUser("Following Page Viewer", "following-page-viewer");
    const followed = await Promise.all(
      Array.from({ length: 3 }, (_, index) =>
        createCreator(`Following Page ${index}`, `following-page-${index}`),
      ),
    );
    for (const target of followed) await followUser(viewer.id, target.id);

    const first = await request(testApp)
      .get(`/api/follows/user/${viewer.id}/following`)
      .query({ limit: 2 });

    expect(first.status).toBe(200);
    expect(first.body.data.items).toHaveLength(2);
    expect(first.body.data.nextCursor).not.toBeNull();

    const second = await request(testApp)
      .get(`/api/follows/user/${viewer.id}/following`)
      .query({ limit: 2, cursor: first.body.data.nextCursor });

    expect(second.status).toBe(200);
    expect(second.body.data.items).toHaveLength(1);
    expect(second.body.data.nextCursor).toBeNull();
  });

  it("returns an empty page for a viewer following nobody", async () => {
    const viewer = await createPlainUser("Empty Following Viewer", "empty-following-viewer");

    const response = await request(testApp).get(`/api/follows/user/${viewer.id}/following`);

    expect(response.status).toBe(200);
    expect(response.body.data.items).toEqual([]);
    expect(response.body.data.nextCursor).toBeNull();
  });
});
