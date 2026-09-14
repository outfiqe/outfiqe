import { randomUUID } from "node:crypto";

import { beforeEach, describe, expect, it } from "vitest";

import { LEADERBOARD_CATEGORY } from "#constants/leaderboard.constants.js";
import { prisma } from "#db/prisma.js";
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
});
