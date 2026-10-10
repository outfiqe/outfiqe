import { randomUUID } from "node:crypto";

import { subDays } from "date-fns/subDays";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { CreatorStatus } from "#generated/prisma/enums.js";
import { decodeCursor } from "#lib/pagination.utils.js";
import { FOR_YOU_MAX_PER_CREATOR } from "#modules/creator-looks/creator-look.constants.js";
import { creatorLookService } from "#modules/creator-looks/creator-look.service.js";
import type { TrendingSnapshotCursor } from "#modules/creator-looks/creator-look.utils.js";
import { platformSettingsService } from "#modules/platform-settings/platform-settings.service.js";
import { redis } from "#redis/redis.client.js";
import { redisKeys } from "#redis/redis.keys.js";
import {
  authHeaderFor,
  createApprovedProduct,
  createCreator,
  createLook,
  followCreator,
  tagProduct,
} from "#test/integration/creator-look-fixtures.js";
import { testApp } from "#test/integration/test-app.js";

const OLDER_DROP_AGE_DAYS = 30;
const PROLIFIC_OLDER_DROP_COUNT = 5;

beforeEach(async () => {
  await redis.flushdb();
  platformSettingsService.invalidate();
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
