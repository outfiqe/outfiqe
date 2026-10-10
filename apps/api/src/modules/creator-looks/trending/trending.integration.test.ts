import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { truncateToHour } from "#lib/trend-scoring.utils.js";
import { creatorLookRepository } from "#modules/creator-looks/creator-look.repository.js";
import { creatorLookService } from "#modules/creator-looks/creator-look.service.js";
import { platformSettingsService } from "#modules/platform-settings/platform-settings.service.js";
import { redis } from "#redis/redis.client.js";
import { redisKeys } from "#redis/redis.keys.js";
import { createCreator, createLook } from "#test/integration/creator-look-fixtures.js";
import { testApp } from "#test/integration/test-app.js";

beforeEach(async () => {
  await redis.flushdb();
  platformSettingsService.invalidate();
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
