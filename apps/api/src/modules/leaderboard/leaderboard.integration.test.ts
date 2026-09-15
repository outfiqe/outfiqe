import { randomUUID } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LEADERBOARD_CATEGORY } from "#constants/leaderboard.constants.js";
import { prisma } from "#db/prisma.js";
import { trendingService } from "#modules/trending/trending.service.js";
import { redis } from "#redis/redis.client.js";

import { leaderboardRepository } from "./leaderboard.repository.js";
import { leaderboardService } from "./leaderboard.service.js";
import { currentIsoWeekKey, previousIsoWeekKey } from "./leaderboard.utils.js";

beforeEach(async () => {
  await redis.flushdb();
});

const createBrand = async (name: string) =>
  prisma.brand.create({
    data: {
      name,
      contactName: "Brand Contact",
      email: `${randomUUID()}@brand.outfiqe.test`,
      phone: `98${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(0, 10),
      instagram: `@${randomUUID().slice(0, 8)}`,
    },
  });

describe("leaderboardService.getTop", () => {
  it("drops a brand from the public ranking the moment they're suspended, even while the cached ZSET is still warm", async () => {
    const brand = await createBrand("Suspend Me Brand");
    const week = currentIsoWeekKey(new Date());
    await leaderboardRepository.replaceWeeklyScores(LEADERBOARD_CATEGORY.MOST_PURCHASED, week, [
      { member: brand.id, score: 50 },
    ]);

    const before = await leaderboardService.getTop(LEADERBOARD_CATEGORY.MOST_PURCHASED);
    expect(before.entries.some((entry) => entry.brandId === brand.id)).toBe(true);

    await prisma.brand.update({ where: { id: brand.id }, data: { accountStatus: "SUSPENDED" } });

    const after = await leaderboardService.getTop(LEADERBOARD_CATEGORY.MOST_PURCHASED);
    expect(after.entries.some((entry) => entry.brandId === brand.id)).toBe(false);
  });

  it("renumbers ranks with no gaps once an ineligible brand is filtered out mid-list", async () => {
    const first = await createBrand("Rank One Brand");
    const suspendedSecond = await createBrand("Rank Two Brand");
    const third = await createBrand("Rank Three Brand");
    const week = currentIsoWeekKey(new Date());
    await leaderboardRepository.replaceWeeklyScores(LEADERBOARD_CATEGORY.MOST_PURCHASED, week, [
      { member: first.id, score: 300 },
      { member: suspendedSecond.id, score: 200 },
      { member: third.id, score: 100 },
    ]);
    await prisma.brand.update({
      where: { id: suspendedSecond.id },
      data: { accountStatus: "SUSPENDED" },
    });

    const { entries } = await leaderboardService.getTop(LEADERBOARD_CATEGORY.MOST_PURCHASED);
    const firstEntry = entries.find((entry) => entry.brandId === first.id);
    const thirdEntry = entries.find((entry) => entry.brandId === third.id);

    expect(firstEntry?.rank).toBe(1);
    expect(thirdEntry?.rank).toBe(2);
  });

  it("computes rank movement off the brand's displayed position, not its pre-filter index, once a brand ahead of it is filtered out", async () => {
    const first = await createBrand("Movement Rank One Brand");
    const suspendedSecond = await createBrand("Movement Rank Two Brand");
    const third = await createBrand("Movement Rank Three Brand");
    const week = currentIsoWeekKey(new Date());
    const previousWeek = previousIsoWeekKey(new Date());
    const scores = [
      { member: first.id, score: 300 },
      { member: suspendedSecond.id, score: 200 },
      { member: third.id, score: 100 },
    ];
    await leaderboardRepository.replaceWeeklyScores(
      LEADERBOARD_CATEGORY.MOST_PURCHASED,
      previousWeek,
      scores,
    );
    await leaderboardRepository.replaceWeeklyScores(
      LEADERBOARD_CATEGORY.MOST_PURCHASED,
      week,
      scores,
    );
    await prisma.brand.update({
      where: { id: suspendedSecond.id },
      data: { accountStatus: "SUSPENDED" },
    });

    const { entries } = await leaderboardService.getTop(LEADERBOARD_CATEGORY.MOST_PURCHASED);
    const thirdEntry = entries.find((entry) => entry.brandId === third.id);

    expect(thirdEntry?.rank).toBe(2);
    expect(thirdEntry?.movement).toBe(1);
  });

  it("excludes a brand whose purchases dropped week-over-week from fastest-growing instead of showing a negative surge", async () => {
    const declining = await createBrand("Declining Brand");
    const now = new Date();

    await leaderboardRepository.replaceWeeklyScores(
      LEADERBOARD_CATEGORY.MOST_PURCHASED,
      previousIsoWeekKey(now),
      [{ member: declining.id, score: 100 }],
    );
    await leaderboardRepository.replaceWeeklyScores(
      LEADERBOARD_CATEGORY.MOST_PURCHASED,
      currentIsoWeekKey(now),
      [{ member: declining.id, score: 20 }],
    );

    await leaderboardService.runFastestGrowingRecompute();
    const { entries } = await leaderboardService.getTop(LEADERBOARD_CATEGORY.FASTEST_GROWING);

    expect(entries.some((entry) => entry.brandId === declining.id)).toBe(false);
  });

  it("still ranks a brand whose purchases grew week-over-week under fastest-growing", async () => {
    const growing = await createBrand("Growing Brand");
    const now = new Date();

    await leaderboardRepository.replaceWeeklyScores(
      LEADERBOARD_CATEGORY.MOST_PURCHASED,
      previousIsoWeekKey(now),
      [{ member: growing.id, score: 20 }],
    );
    await leaderboardRepository.replaceWeeklyScores(
      LEADERBOARD_CATEGORY.MOST_PURCHASED,
      currentIsoWeekKey(now),
      [{ member: growing.id, score: 100 }],
    );

    await leaderboardService.runFastestGrowingRecompute();
    const { entries } = await leaderboardService.getTop(LEADERBOARD_CATEGORY.FASTEST_GROWING);
    const entry = entries.find((row) => row.brandId === growing.id);

    expect(entry?.score).toBe(400);
  });

  it("shows an empty board once this week has genuinely been computed, instead of falling back to a stale zero-score entry from last week", async () => {
    const brand = await createBrand("Zero Activity Brand");
    const now = new Date();

    await leaderboardRepository.replaceWeeklyScores(
      LEADERBOARD_CATEGORY.MOST_PURCHASED,
      previousIsoWeekKey(now),
      [{ member: brand.id, score: 0 }],
    );

    await leaderboardService.runMostPurchasedRecompute();
    const { entries } = await leaderboardService.getTop(LEADERBOARD_CATEGORY.MOST_PURCHASED);

    expect(entries).toEqual([]);
  });

  it("still bridges to last week's board while this week genuinely hasn't been computed yet", async () => {
    const brand = await createBrand("Legacy Brand");
    const now = new Date();

    await leaderboardRepository.replaceWeeklyScores(
      LEADERBOARD_CATEGORY.MOST_PURCHASED,
      previousIsoWeekKey(now),
      [{ member: brand.id, score: 400 }],
    );

    const { entries } = await leaderboardService.getTop(LEADERBOARD_CATEGORY.MOST_PURCHASED);

    expect(entries.some((entry) => entry.brandId === brand.id && entry.score === 400)).toBe(true);
  });
});

describe("leaderboardService.runTrendingRecompute", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("excludes a brand whose aggregated trend score comes out to zero", async () => {
    const trending = await createBrand("Trending Brand");
    const flat = await createBrand("Flat Brand");
    vi.spyOn(trendingService, "getBrandTrendScores").mockResolvedValue(
      new Map([
        [trending.id, 42],
        [flat.id, 0],
      ]),
    );

    await leaderboardService.runTrendingRecompute();
    const { entries } = await leaderboardService.getTop(LEADERBOARD_CATEGORY.TRENDING);

    expect(entries.some((entry) => entry.brandId === trending.id)).toBe(true);
    expect(entries.some((entry) => entry.brandId === flat.id)).toBe(false);
  });
});
