import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { CreatorLeaderboardCategory, CreatorStatus, UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { currentIsoWeekKey, previousIsoWeekKey } from "#lib/iso-week.utils.js";
import { crmAccessService } from "#modules/crm-access/crm-access.service.js";
import { redis } from "#redis/redis.client.js";
import { redisKeys } from "#redis/redis.keys.js";
import { grantPlatformPermissions } from "#test/integration/authHelpers.js";
import { ensurePlatformOrganizationExists } from "#test/integration/crmFixtures.js";
import { testApp } from "#test/integration/testApp.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

import { creatorLeaderboardRepository } from "./creatorLeaderboard.repository.js";
import { creatorLeaderboardService } from "./creatorLeaderboard.service.js";

const createCreator = async (overrides: { hideFromLeaderboards?: boolean } = {}) =>
  prisma.user.create({
    data: {
      email: `creator-${randomUUID()}@outfiqe.test`,
      name: "Leaderboard Creator",
      handle: `creator-${randomUUID().slice(0, 8)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      isCreator: true,
      creatorStatus: CreatorStatus.APPROVED,
      followerCount: 0,
      hideFromLeaderboards: overrides.hideFromLeaderboards ?? false,
    },
  });

const createAdmin = async () => {
  const admin = await createCreator();
  await ensurePlatformOrganizationExists();
  await crmAccessService.grantPlatformStaffMembership(admin.id);
  await grantPlatformPermissions(admin.id, "platform:gamification:manage");
  const { accessToken } = generateTokenpair({ sub: admin.id, role: UserRole.ADMIN });
  return { ...admin, header: `Bearer ${accessToken}` };
};

const ensureFloorLevel = async () => {
  const existing = await prisma.level.findFirst({ where: { requiredXp: 0, isActive: true } });
  if (existing) return existing;
  return prisma.level.create({
    data: { level: 1, name: "Leaderboard Test Floor", requiredXp: 0 },
  });
};

const giveXp = async (userId: string, totalXp: number) => {
  const floorLevel = await ensureFloorLevel();
  await prisma.userProgress.upsert({
    where: { userId },
    create: { userId, totalXp, currentLevelId: floorLevel.id },
    update: { totalXp },
  });
};

const giveLook = async (creatorId: string, likeCount: number) =>
  prisma.creatorLook.create({
    data: { creatorId, imageUrl: "https://example.test/look.jpg", likeCount },
  });

const giveBadge = async (userId: string) => {
  const badge = await prisma.badge.create({
    data: {
      name: `Leaderboard Test Badge ${randomUUID()}`,
      description: "A badge for leaderboard integration testing.",
      category: "SPECIAL",
      rarity: "COMMON",
      icon: "🏅",
      designConfig: { shape: "circle", primaryColor: "#000000" },
    },
  });
  await prisma.userBadge.create({ data: { userId, badgeId: badge.id } });
};

describe("creatorLeaderboardService.runRecompute + getTop", () => {
  it("ranks creators by XP for TOP_XP", async () => {
    const [low, high] = await Promise.all([createCreator(), createCreator()]);
    await giveXp(low.id, 100);
    await giveXp(high.id, 900);

    await creatorLeaderboardService.runRecompute();
    const { entries, isEnabled } = await creatorLeaderboardService.getTop(
      CreatorLeaderboardCategory.TOP_XP,
    );

    expect(isEnabled).toBe(true);
    const ranked = entries.filter((entry) => [low.id, high.id].includes(entry.creatorId));
    expect(ranked[0]?.creatorId).toBe(high.id);
    expect(ranked.find((entry) => entry.creatorId === high.id)?.score).toBe(900);
  });

  it("ranks creators by summed likes for MOST_LIKES", async () => {
    const creator = await createCreator();
    await giveLook(creator.id, 40);
    await giveLook(creator.id, 60);

    await creatorLeaderboardService.runRecompute();
    const { entries } = await creatorLeaderboardService.getTop(
      CreatorLeaderboardCategory.MOST_LIKES,
    );

    const entry = entries.find((row) => row.creatorId === creator.id);
    expect(entry?.score).toBe(100);
  });

  it("counts collected badges for MOST_ACHIEVEMENTS", async () => {
    const creator = await createCreator();
    await giveBadge(creator.id);
    await giveBadge(creator.id);

    await creatorLeaderboardService.runRecompute();
    const { entries } = await creatorLeaderboardService.getTop(
      CreatorLeaderboardCategory.MOST_ACHIEVEMENTS,
    );

    const entry = entries.find((row) => row.creatorId === creator.id);
    expect(entry?.score).toBe(2);
  });

  it("combines XP and a weighted follower count for TOP_CREATOR", async () => {
    const creator = await createCreator();
    await giveXp(creator.id, 200);
    await prisma.user.update({ where: { id: creator.id }, data: { followerCount: 5 } });

    await creatorLeaderboardService.runRecompute();
    const { entries } = await creatorLeaderboardService.getTop(
      CreatorLeaderboardCategory.TOP_CREATOR,
    );

    const entry = entries.find((row) => row.creatorId === creator.id);
    expect(entry?.score).toBe(200 + 5 * 10);
  });

  it("excludes a creator who opted out of leaderboards entirely", async () => {
    const optedOut = await createCreator({ hideFromLeaderboards: true });
    await giveXp(optedOut.id, 5000);

    await creatorLeaderboardService.runRecompute();
    const { entries } = await creatorLeaderboardService.getTop(CreatorLeaderboardCategory.TOP_XP);

    expect(entries.some((entry) => entry.creatorId === optedOut.id)).toBe(false);
  });

  it("excludes a creator with zero activity from every stats-derived category, not just RISING_CREATOR", async () => {
    const zeroActivity = await createCreator();
    const active = await createCreator();
    await giveXp(active.id, 50);
    await giveLook(active.id, 5);
    await giveBadge(active.id);

    await creatorLeaderboardService.runRecompute();

    const categories = [
      CreatorLeaderboardCategory.TOP_XP,
      CreatorLeaderboardCategory.TOP_CREATOR,
      CreatorLeaderboardCategory.MOST_LIKES,
      CreatorLeaderboardCategory.MOST_ENGAGED,
      CreatorLeaderboardCategory.TOP_SELLER,
      CreatorLeaderboardCategory.MOST_ACHIEVEMENTS,
    ];

    for (const category of categories) {
      const { entries } = await creatorLeaderboardService.getTop(category);
      expect(entries.some((entry) => entry.creatorId === zeroActivity.id)).toBe(false);
    }
  });

  it("drops a creator from the public ranking the moment they're banned, even while the cached ZSET is still warm", async () => {
    const banned = await createCreator();
    await giveXp(banned.id, 5000);

    await creatorLeaderboardService.runRecompute();
    const before = await creatorLeaderboardService.getTop(CreatorLeaderboardCategory.TOP_XP);
    expect(before.entries.some((entry) => entry.creatorId === banned.id)).toBe(true);

    await prisma.user.update({
      where: { id: banned.id },
      data: { accountStatus: "BANNED" },
    });

    const after = await creatorLeaderboardService.getTop(CreatorLeaderboardCategory.TOP_XP);
    expect(after.entries.some((entry) => entry.creatorId === banned.id)).toBe(false);
  });

  it("renumbers ranks with no gaps once an ineligible creator is filtered out mid-list", async () => {
    const first = await createCreator();
    const bannedSecond = await createCreator();
    const third = await createCreator();
    await giveXp(first.id, 300);
    await giveXp(bannedSecond.id, 200);
    await giveXp(third.id, 100);

    await creatorLeaderboardService.runRecompute();
    await prisma.user.update({
      where: { id: bannedSecond.id },
      data: { accountStatus: "BANNED" },
    });

    const { entries } = await creatorLeaderboardService.getTop(CreatorLeaderboardCategory.TOP_XP);
    const firstEntry = entries.find((entry) => entry.creatorId === first.id);
    const thirdEntry = entries.find((entry) => entry.creatorId === third.id);

    expect(firstEntry?.rank).toBe(1);
    expect(thirdEntry?.rank).toBe(2);
  });

  it("computes rank movement off the creator's displayed position, not their pre-filter index, once someone ahead of them is filtered out", async () => {
    const first = await createCreator();
    const bannedSecond = await createCreator();
    const third = await createCreator();
    const now = new Date();

    await creatorLeaderboardRepository.replaceWeeklyScores(
      CreatorLeaderboardCategory.TOP_XP,
      previousIsoWeekKey(now),
      [
        { member: first.id, score: 300 },
        { member: bannedSecond.id, score: 200 },
        { member: third.id, score: 100 },
      ],
    );
    await giveXp(first.id, 300);
    await giveXp(bannedSecond.id, 200);
    await giveXp(third.id, 100);

    await creatorLeaderboardService.runRecompute();
    await prisma.user.update({
      where: { id: bannedSecond.id },
      data: { accountStatus: "BANNED" },
    });

    const { entries } = await creatorLeaderboardService.getTop(CreatorLeaderboardCategory.TOP_XP);
    const thirdEntry = entries.find((entry) => entry.creatorId === third.id);

    expect(thirdEntry?.rank).toBe(2);
    expect(thirdEntry?.movement).toBe(1);
  });

  it("excludes a creator whose XP dropped week-over-week from RISING_CREATOR instead of showing a negative surge", async () => {
    const demoted = await createCreator();
    const now = new Date();

    await creatorLeaderboardRepository.replaceWeeklyScores(
      CreatorLeaderboardCategory.TOP_XP,
      previousIsoWeekKey(now),
      [{ member: demoted.id, score: 500 }],
    );
    await giveXp(demoted.id, 100);

    await creatorLeaderboardService.runRecompute();
    const { entries } = await creatorLeaderboardService.getTop(
      CreatorLeaderboardCategory.RISING_CREATOR,
    );

    expect(entries.some((entry) => entry.creatorId === demoted.id)).toBe(false);
  });

  it("derives RISING_CREATOR from the week-over-week change in TOP_XP", async () => {
    const creator = await createCreator();
    const now = new Date();

    await creatorLeaderboardRepository.replaceWeeklyScores(
      CreatorLeaderboardCategory.TOP_XP,
      previousIsoWeekKey(now),
      [{ member: creator.id, score: 100 }],
    );
    await giveXp(creator.id, 200);

    await creatorLeaderboardService.runRecompute();
    const { entries } = await creatorLeaderboardService.getTop(
      CreatorLeaderboardCategory.RISING_CREATOR,
    );

    const entry = entries.find((row) => row.creatorId === creator.id);
    expect(entry?.score).toBe(100);
  });

  it("shows an empty board once this week is genuinely computed, instead of falling back to a stale zero-score entry from last week", async () => {
    const zeroActivity = await createCreator();
    const now = new Date();

    await creatorLeaderboardRepository.replaceWeeklyScores(
      CreatorLeaderboardCategory.TOP_XP,
      previousIsoWeekKey(now),
      [{ member: zeroActivity.id, score: 0 }],
    );

    await creatorLeaderboardService.runRecompute();
    const { entries } = await creatorLeaderboardService.getTop(CreatorLeaderboardCategory.TOP_XP);

    expect(entries).toEqual([]);
  });

  it("still bridges to last week's board while this week genuinely hasn't been computed yet", async () => {
    const creator = await createCreator();
    const now = new Date();

    await creatorLeaderboardRepository.replaceWeeklyScores(
      CreatorLeaderboardCategory.TOP_XP,
      previousIsoWeekKey(now),
      [{ member: creator.id, score: 400 }],
    );
    await redis.del(
      redisKeys.creatorLeaderboard(CreatorLeaderboardCategory.TOP_XP, currentIsoWeekKey(now)),
    );
    await redis.del(
      redisKeys.creatorLeaderboardComputed(
        CreatorLeaderboardCategory.TOP_XP,
        currentIsoWeekKey(now),
      ),
    );

    const { entries } = await creatorLeaderboardService.getTop(CreatorLeaderboardCategory.TOP_XP);

    expect(entries.some((entry) => entry.creatorId === creator.id && entry.score === 400)).toBe(
      true,
    );
  });
});

describe("GET /api/creator-leaderboard/categories", () => {
  it("lists all seven categories with an enabled flag", async () => {
    const response = await request(testApp).get("/api/creator-leaderboard/categories");

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(Object.keys(CreatorLeaderboardCategory).length);
    expect(response.body.data.map((row: { category: string }) => row.category)).toEqual(
      expect.arrayContaining(Object.values(CreatorLeaderboardCategory)),
    );
  });
});

describe("PATCH /api/creator-leaderboard/categories/:category (admin)", () => {
  it("disables a category and the public read reflects it with no entries", async () => {
    const admin = await createAdmin();
    const creator = await createCreator();
    await giveXp(creator.id, 300);
    await creatorLeaderboardService.runRecompute();

    const disable = await request(testApp)
      .patch(`/api/creator-leaderboard/categories/${CreatorLeaderboardCategory.MOST_ENGAGED}`)
      .set("Authorization", admin.header)
      .send({ enabled: false });
    expect(disable.status).toBe(200);
    expect(disable.body.data.enabled).toBe(false);

    const read = await request(testApp).get(
      `/api/creator-leaderboard?category=${CreatorLeaderboardCategory.MOST_ENGAGED}`,
    );
    expect(read.status).toBe(200);
    expect(read.body.data.isEnabled).toBe(false);
    expect(read.body.data.entries).toEqual([]);

    await request(testApp)
      .patch(`/api/creator-leaderboard/categories/${CreatorLeaderboardCategory.MOST_ENGAGED}`)
      .set("Authorization", admin.header)
      .send({ enabled: true });
  });

  it("requires the ADMIN role", async () => {
    const nonAdmin = await createCreator();
    const { accessToken } = generateTokenpair({ sub: nonAdmin.id, role: UserRole.CUSTOMER });

    const response = await request(testApp)
      .patch(`/api/creator-leaderboard/categories/${CreatorLeaderboardCategory.TOP_XP}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ enabled: false });

    expect(response.status).toBe(403);
  });

  it("blocks a platform staffer without platform:gamification:manage", async () => {
    const staffer = await createCreator();
    await ensurePlatformOrganizationExists();
    await crmAccessService.grantPlatformStaffMembership(staffer.id);
    const { accessToken } = generateTokenpair({ sub: staffer.id, role: UserRole.ADMIN });

    const response = await request(testApp)
      .patch(`/api/creator-leaderboard/categories/${CreatorLeaderboardCategory.TOP_XP}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ enabled: false });

    expect(response.status).toBe(403);
  });
});

describe("GET /api/creator-leaderboard", () => {
  it("defaults to TOP_XP and returns a well-formed snapshot", async () => {
    const response = await request(testApp).get("/api/creator-leaderboard");

    expect(response.status).toBe(200);
    expect(response.body.data.category).toBe(CreatorLeaderboardCategory.TOP_XP);
    expect(response.body.data).toHaveProperty("week");
    expect(response.body.data).toHaveProperty("isEnabled");
    expect(Array.isArray(response.body.data.entries)).toBe(true);
  });
});
