import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { CreatorLeaderboardCategory, CreatorStatus, UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { previousIsoWeekKey } from "#lib/iso-week.utils.js";
import { crmAccessService } from "#modules/crm-access/crm-access.service.js";
import { ensurePlatformOrganizationExists } from "#test/integration/crmFixtures.js";
import { testApp } from "#test/integration/testApp.js";

import { creatorLeaderboardRepository } from "./creatorLeaderboard.repository.js";
import { creatorLeaderboardService } from "./creatorLeaderboard.service.js";

const uniquePhone = () => `98${randomUUID().replace(/\D/g, "1").slice(0, 8)}`;

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
