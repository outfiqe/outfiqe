import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import {
  AccountStatus,
  CreatorStatus,
  FollowTargetType,
  UserRole,
} from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { decodeCursor } from "#lib/pagination.utils.js";
import { creatorLookService } from "#modules/creator-looks/creatorLook.service.js";
import { redis } from "#redis/redis.client.js";
import { CREATOR_MOMENTUM_SCORE_CACHE_KEY, redisKeys } from "#redis/redis.keys.js";
import { testApp } from "#test/integration/testApp.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

import type { SuggestionSnapshotCursor } from "./follow.types.js";

beforeEach(async () => {
  await redis.flushdb();
});

const createCreator = async (name: string, handle: string, followerCount = 0) =>
  prisma.user.create({
    data: {
      email: `${handle}-${randomUUID()}@outfiqe.test`,
      name,
      handle: `${handle}-${randomUUID().slice(0, 6)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      isCreator: true,
      creatorStatus: CreatorStatus.APPROVED,
      followerCount,
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

const createPlainUser = async (name: string, handle: string, role: UserRole = UserRole.CUSTOMER) =>
  prisma.user.create({
    data: {
      email: `${handle}-${randomUUID()}@outfiqe.test`,
      name,
      handle: `${handle}-${randomUUID().slice(0, 6)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role,
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

const followUser = async (followerId: string, targetId: string) =>
  prisma.follow.create({
    data: { followerId, followingType: FollowTargetType.USER, followingId: targetId },
  });

const authHeaderFor = (userId: string, role: UserRole = UserRole.CUSTOMER) => {
  const { accessToken } = generateTokenpair({ sub: userId, role });
  return `Bearer ${accessToken}`;
};

const requestSuggestions = (viewerId: string) =>
  request(testApp)
    .get("/api/follows/suggested-creators")
    .set("Authorization", authHeaderFor(viewerId));

describe("GET /api/follows/suggested-creators", () => {
  it("ranks a mutual-follow candidate above an equally-popular stranger", async () => {
    const viewer = await createCreator("Suggestion Viewer", "suggestion-viewer");
    const candidateA = await createCreator("Mutual Candidate", "mutual-candidate", 100);
    const candidateB = await createCreator("Stranger Candidate", "stranger-candidate", 100);
    const fan = await createCreator("Momentum Fan", "momentum-fan-parity");

    for (const candidate of [candidateA, candidateB]) {
      const look = await createLook(candidate.id, "Equal momentum post");
      await prisma.creatorLookLike.create({
        data: { creatorLookId: look.id, userId: fan.id },
      });
    }
    await creatorLookService.runTrendingAggregation();
    await creatorLookService.runCreatorMomentumScoring();

    const connectors = await Promise.all([
      createCreator("Connector One", "connector-one"),
      createCreator("Connector Two", "connector-two"),
      createCreator("Connector Three", "connector-three"),
    ]);
    for (const connector of connectors) {
      await followUser(viewer.id, connector.id);
      await followUser(connector.id, candidateA.id);
    }

    const response = await requestSuggestions(viewer.id);

    expect(response.status).toBe(200);
    const ids: string[] = response.body.data.creators.map((creator: { id: string }) => creator.id);
    expect(ids).toContain(candidateA.id);
    expect(ids).toContain(candidateB.id);
    expect(ids.indexOf(candidateA.id)).toBeLessThan(ids.indexOf(candidateB.id));
  });

  it("excludes the viewer and creators already followed", async () => {
    const viewer = await createCreator("Excluding Viewer", "excluding-viewer", 50);
    const alreadyFollowed = await createCreator("Already Followed", "already-followed", 50);
    const discoverable = await createCreator("Discoverable Creator", "discoverable-creator", 50);
    await followUser(viewer.id, alreadyFollowed.id);

    await createLook(discoverable.id, "Discoverable post");
    await creatorLookService.runTrendingAggregation();
    await creatorLookService.runTrendingScoring();

    const response = await requestSuggestions(viewer.id);

    expect(response.status).toBe(200);
    const ids: string[] = response.body.data.creators.map((creator: { id: string }) => creator.id);
    expect(ids).not.toContain(viewer.id);
    expect(ids).not.toContain(alreadyFollowed.id);
  });

  it("falls back to the legacy popularity list when there's no signal and no scored momentum yet", async () => {
    const viewer = await createCreator("Cold Start Viewer", "cold-start-viewer");
    const onlyCreator = await createCreator("Only Creator", "only-creator", 5);

    const response = await requestSuggestions(viewer.id);

    expect(response.status).toBe(200);
    const ids: string[] = response.body.data.creators.map((creator: { id: string }) => creator.id);
    expect(ids).toContain(onlyCreator.id);
  });

  it("surfaces a creator through the momentum pool alone, with no personalization signal", async () => {
    const viewer = await createCreator("Discovery Viewer", "discovery-viewer");
    const someoneElse = await createCreator("Momentum Fan", "momentum-fan");
    const momentumCreator = await createCreator("Momentum Creator", "momentum-creator", 20);

    const look = await createLook(momentumCreator.id, "Momentum post");
    await prisma.creatorLookLike.create({
      data: { creatorLookId: look.id, userId: someoneElse.id },
    });
    await creatorLookService.runTrendingAggregation();
    const { ranked } = await creatorLookService.runCreatorMomentumScoring();
    expect(ranked.some((entry) => entry.creatorId === momentumCreator.id)).toBe(true);

    const response = await requestSuggestions(viewer.id);

    expect(response.status).toBe(200);
    const ids: string[] = response.body.data.creators.map((creator: { id: string }) => creator.id);
    expect(ids).toContain(momentumCreator.id);
  });

  it("surfaces a creator through topical hashtag affinity, without the viewer ever engaging with them directly", async () => {
    const viewer = await createCreator("Hashtag Viewer", "hashtag-viewer");
    const engagedCreator = await createCreator("Engaged Creator", "engaged-creator");
    const hashtagCreator = await createCreator("Hashtag Match Creator", "hashtag-match-creator");
    const marker = randomUUID().slice(0, 8);

    const engagedLook = await createLook(engagedCreator.id, `Engaged post #shared${marker}`);
    await prisma.creatorLookHashtag.create({
      data: { creatorLookId: engagedLook.id, tag: `shared${marker}` },
    });
    await prisma.creatorLookLike.create({
      data: { creatorLookId: engagedLook.id, userId: viewer.id },
    });

    const hashtagLook = await createLook(hashtagCreator.id, `Unengaged post #shared${marker}`);
    await prisma.creatorLookHashtag.create({
      data: { creatorLookId: hashtagLook.id, tag: `shared${marker}` },
    });

    const response = await requestSuggestions(viewer.id);

    expect(response.status).toBe(200);
    const ids: string[] = response.body.data.creators.map((creator: { id: string }) => creator.id);
    expect(ids).toContain(hashtagCreator.id);
  });

  it("requires authentication", async () => {
    const response = await request(testApp).get("/api/follows/suggested-creators");
    expect(response.status).toBe(401);
  });

  it("rejects a platform admin viewer", async () => {
    const admin = await createCreator("Admin Viewer", "admin-viewer");

    const response = await request(testApp)
      .get("/api/follows/suggested-creators")
      .set("Authorization", authHeaderFor(admin.id, UserRole.ADMIN));

    expect(response.status).toBe(403);
  });

  it("paginates through the full ranked pool with a stable session snapshot, without repeating a creator", async () => {
    const viewer = await createCreator("Pagination Viewer", "pagination-viewer");
    const fan = await createCreator("Pagination Fan", "pagination-fan");
    const candidates = await Promise.all(
      Array.from({ length: 5 }, (_, index) =>
        createCreator(`Pagination Candidate ${index}`, `pagination-candidate-${index}`, index),
      ),
    );
    for (const candidate of candidates) {
      const look = await createLook(candidate.id, "Pagination post");
      await prisma.creatorLookLike.create({ data: { creatorLookId: look.id, userId: fan.id } });
    }
    await creatorLookService.runTrendingAggregation();
    await creatorLookService.runCreatorMomentumScoring();

    const first = await request(testApp)
      .get("/api/follows/suggested-creators")
      .query({ limit: 2 })
      .set("Authorization", authHeaderFor(viewer.id));

    expect(first.status).toBe(200);
    expect(first.body.data.creators).toHaveLength(2);
    expect(first.body.data.nextCursor).not.toBeNull();

    const second = await request(testApp)
      .get("/api/follows/suggested-creators")
      .query({ limit: 10, cursor: first.body.data.nextCursor })
      .set("Authorization", authHeaderFor(viewer.id));

    expect(second.status).toBe(200);
    const firstIds: string[] = first.body.data.creators.map(
      (creator: { id: string }) => creator.id,
    );
    const secondIds: string[] = second.body.data.creators.map(
      (creator: { id: string }) => creator.id,
    );
    expect(secondIds.length).toBeGreaterThan(0);
    expect(secondIds.some((id) => firstIds.includes(id))).toBe(false);
  });

  it("resumes from where it left off instead of rewinding to page one when the session snapshot expires mid-scroll", async () => {
    const viewer = await createCreator("Resume Suggestions Viewer", "resume-suggestions-viewer");
    const strongFan = await createCreator("Resume Strong Fan", "resume-strong-fan");
    const weakFan = await createCreator("Resume Weak Fan", "resume-weak-fan");
    const extraFan = await createCreator("Resume Extra Fan", "resume-extra-fan");
    const topCandidate = await createCreator("Resume Top Candidate", "resume-top-candidate", 50);
    const secondCandidate = await createCreator(
      "Resume Second Candidate",
      "resume-second-candidate",
      10,
    );

    const topLook = await createLook(topCandidate.id, "Resume top post");
    await prisma.creatorLookLike.createMany({
      data: [
        { creatorLookId: topLook.id, userId: strongFan.id },
        { creatorLookId: topLook.id, userId: weakFan.id },
        { creatorLookId: topLook.id, userId: extraFan.id },
      ],
    });
    const secondLook = await createLook(secondCandidate.id, "Resume second post");
    await prisma.creatorLookLike.create({
      data: { creatorLookId: secondLook.id, userId: strongFan.id },
    });
    await creatorLookService.runTrendingAggregation();
    await creatorLookService.runCreatorMomentumScoring();

    const first = await request(testApp)
      .get("/api/follows/suggested-creators")
      .query({ limit: 1 })
      .set("Authorization", authHeaderFor(viewer.id));
    expect(first.status).toBe(200);
    expect(first.body.data.creators[0]?.id).toBe(topCandidate.id);
    expect(first.body.data.nextCursor).not.toBeNull();

    const firstCursor = decodeCursor<SuggestionSnapshotCursor>(first.body.data.nextCursor);
    await redis.del(redisKeys.cache("suggested-creators-snapshot", firstCursor?.sessionId ?? ""));

    const second = await request(testApp)
      .get("/api/follows/suggested-creators")
      .query({ limit: 1, cursor: first.body.data.nextCursor })
      .set("Authorization", authHeaderFor(viewer.id));

    expect(second.status).toBe(200);
    expect(second.body.data.creators[0]?.id).toBe(secondCandidate.id);
  });

  it("never suggests a creator through a fresh candidate-pool build once their account is banned", async () => {
    const viewer = await createCreator("Banned Pool Viewer", "banned-pool-viewer");
    const connectors = await Promise.all([
      createCreator("Banned Pool Connector One", "banned-pool-connector-one"),
      createCreator("Banned Pool Connector Two", "banned-pool-connector-two"),
      createCreator("Banned Pool Connector Three", "banned-pool-connector-three"),
    ]);
    const bannedCandidate = await createCreator(
      "Banned Pool Candidate",
      "banned-pool-candidate",
      50,
    );
    for (const connector of connectors) {
      await followUser(viewer.id, connector.id);
      await followUser(connector.id, bannedCandidate.id);
    }
    await prisma.user.update({
      where: { id: bannedCandidate.id },
      data: { accountStatus: AccountStatus.BANNED },
    });

    const response = await requestSuggestions(viewer.id);

    expect(response.status).toBe(200);
    const ids: string[] = response.body.data.creators.map((creator: { id: string }) => creator.id);
    expect(ids).not.toContain(bannedCandidate.id);
  });

  it("drops a creator from a cached suggestion snapshot once their account is banned mid-session", async () => {
    const viewer = await createCreator("Mid-Session Ban Viewer", "mid-session-ban-viewer");
    const strongFan = await createCreator("Mid-Session Ban Strong Fan", "mid-session-ban-strong");
    const weakFan = await createCreator("Mid-Session Ban Weak Fan", "mid-session-ban-weak");
    const topCandidate = await createCreator(
      "Mid-Session Ban Top Candidate",
      "mid-session-ban-top",
      50,
    );
    const soonBannedCandidate = await createCreator(
      "Mid-Session Ban Second Candidate",
      "mid-session-ban-second",
      10,
    );
    const topLook = await createLook(topCandidate.id, "Mid-session ban top post");
    await prisma.creatorLookLike.createMany({
      data: [
        { creatorLookId: topLook.id, userId: strongFan.id },
        { creatorLookId: topLook.id, userId: weakFan.id },
      ],
    });
    const secondLook = await createLook(soonBannedCandidate.id, "Mid-session ban second post");
    await prisma.creatorLookLike.create({
      data: { creatorLookId: secondLook.id, userId: strongFan.id },
    });
    await creatorLookService.runTrendingAggregation();
    await creatorLookService.runCreatorMomentumScoring();

    const first = await request(testApp)
      .get("/api/follows/suggested-creators")
      .query({ limit: 1 })
      .set("Authorization", authHeaderFor(viewer.id));
    expect(first.status).toBe(200);
    expect(first.body.data.creators[0]?.id).toBe(topCandidate.id);
    expect(first.body.data.nextCursor).not.toBeNull();

    await prisma.user.update({
      where: { id: soonBannedCandidate.id },
      data: { accountStatus: AccountStatus.BANNED },
    });

    const second = await request(testApp)
      .get("/api/follows/suggested-creators")
      .query({ limit: 1, cursor: first.body.data.nextCursor })
      .set("Authorization", authHeaderFor(viewer.id));

    expect(second.status).toBe(200);
    const secondIds: string[] = second.body.data.creators.map(
      (creator: { id: string }) => creator.id,
    );
    expect(secondIds).not.toContain(soonBannedCandidate.id);
  });

  it("drops a creator from a cached suggestion snapshot once they're de-approved mid-session", async () => {
    const viewer = await createCreator("Mid-Session Reject Viewer", "mid-session-reject-viewer");
    const strongFan = await createCreator(
      "Mid-Session Reject Strong Fan",
      "mid-session-reject-strong",
    );
    const weakFan = await createCreator("Mid-Session Reject Weak Fan", "mid-session-reject-weak");
    const topCandidate = await createCreator(
      "Mid-Session Reject Top Candidate",
      "mid-session-reject-top",
      50,
    );
    const soonRejectedCandidate = await createCreator(
      "Mid-Session Reject Second Candidate",
      "mid-session-reject-second",
      10,
    );
    const topLook = await createLook(topCandidate.id, "Mid-session reject top post");
    await prisma.creatorLookLike.createMany({
      data: [
        { creatorLookId: topLook.id, userId: strongFan.id },
        { creatorLookId: topLook.id, userId: weakFan.id },
      ],
    });
    const secondLook = await createLook(soonRejectedCandidate.id, "Mid-session reject second post");
    await prisma.creatorLookLike.create({
      data: { creatorLookId: secondLook.id, userId: strongFan.id },
    });
    await creatorLookService.runTrendingAggregation();
    await creatorLookService.runCreatorMomentumScoring();

    const first = await request(testApp)
      .get("/api/follows/suggested-creators")
      .query({ limit: 1 })
      .set("Authorization", authHeaderFor(viewer.id));
    expect(first.status).toBe(200);
    expect(first.body.data.creators[0]?.id).toBe(topCandidate.id);
    expect(first.body.data.nextCursor).not.toBeNull();

    await prisma.user.update({
      where: { id: soonRejectedCandidate.id },
      data: { creatorStatus: CreatorStatus.REJECTED },
    });

    const second = await request(testApp)
      .get("/api/follows/suggested-creators")
      .query({ limit: 1, cursor: first.body.data.nextCursor })
      .set("Authorization", authHeaderFor(viewer.id));

    expect(second.status).toBe(200);
    const secondIds: string[] = second.body.data.creators.map(
      (creator: { id: string }) => creator.id,
    );
    expect(secondIds).not.toContain(soonRejectedCandidate.id);
  });

  it("excludes a not-yet-approved or banned creator from the legacy fallback list, not just ranks them lower", async () => {
    const viewer = await createCreator("Legacy Filter Viewer", "legacy-filter-viewer");
    const pendingCreator = await prisma.user.create({
      data: {
        email: `legacy-pending-${randomUUID()}@outfiqe.test`,
        name: "Legacy Pending Creator",
        handle: `legacy-pending-${randomUUID().slice(0, 6)}`,
        phone: uniquePhone(),
        passwordHash: "not-used-in-tests",
        isCreator: true,
        creatorStatus: CreatorStatus.PENDING,
        followerCount: 1000,
      },
    });
    const bannedCreator = await createCreator(
      "Legacy Banned Creator",
      "legacy-banned-creator",
      1000,
    );
    await prisma.user.update({
      where: { id: bannedCreator.id },
      data: { accountStatus: AccountStatus.BANNED },
    });
    const approvedCreator = await createCreator(
      "Legacy Approved Creator",
      "legacy-approved-creator",
      1,
    );

    const response = await requestSuggestions(viewer.id);

    expect(response.status).toBe(200);
    const ids: string[] = response.body.data.creators.map((creator: { id: string }) => creator.id);
    expect(ids).toContain(approvedCreator.id);
    expect(ids).not.toContain(pendingCreator.id);
    expect(ids).not.toContain(bannedCreator.id);
  });

  it("degrades gracefully to candidate generation without the momentum pool when its cache holds corrupted data", async () => {
    const viewer = await createCreator("Corrupt Cache Viewer", "corrupt-cache-viewer");
    const connectors = await Promise.all([
      createCreator("Corrupt Cache Connector One", "corrupt-cache-connector-one"),
      createCreator("Corrupt Cache Connector Two", "corrupt-cache-connector-two"),
    ]);
    const mutualCandidate = await createCreator(
      "Corrupt Cache Mutual Candidate",
      "corrupt-cache-mutual-candidate",
      5,
    );
    for (const connector of connectors) {
      await followUser(viewer.id, connector.id);
      await followUser(connector.id, mutualCandidate.id);
    }
    await redis.set(CREATOR_MOMENTUM_SCORE_CACHE_KEY, "not-valid-json");

    const response = await requestSuggestions(viewer.id);

    expect(response.status).toBe(200);
    const ids: string[] = response.body.data.creators.map((creator: { id: string }) => creator.id);
    expect(ids).toContain(mutualCandidate.id);
  });
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

  it("rejects a platform admin following a creator", async () => {
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
