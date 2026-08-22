import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { CreatorLeaderboardCategory, CreatorStatus } from "#generated/prisma/enums.js";
import { currentIsoWeekKey } from "#lib/iso-week.utils.js";
import { creatorLeaderboardRepository } from "#modules/creator-leaderboard/creatorLeaderboard.repository.js";
import { creatorLeaderboardService } from "#modules/creator-leaderboard/creatorLeaderboard.service.js";

import { achievementService } from "./achievement.service.js";

const uniquePhone = () => `98${randomUUID().replace(/\D/g, "1").slice(0, 8)}`;

const createCreator = async () =>
  prisma.user.create({
    data: {
      email: `dynamic-badge-${randomUUID()}@outfiqe.test`,
      name: "Dynamic Badge Tester",
      handle: `dynamic-badge-${randomUUID().slice(0, 8)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      isCreator: true,
      creatorStatus: CreatorStatus.APPROVED,
    },
  });

const ensureFloorLevel = async () => {
  const existing = await prisma.level.findFirst({ where: { requiredXp: 0, isActive: true } });
  if (existing) return existing;
  return prisma.level.create({
    data: { level: 1, name: "Dynamic Badge Test Floor", requiredXp: 0 },
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

const rankOfTopXp = async (userId: string) =>
  creatorLeaderboardRepository.rankOf(
    CreatorLeaderboardCategory.TOP_XP,
    currentIsoWeekKey(new Date()),
    userId,
  );

const createRankBadge = async (
  topXpRankThreshold: number,
  { isDynamic }: { isDynamic: boolean },
) => {
  const badge = await prisma.badge.create({
    data: {
      name: `Dynamic Rank Badge ${randomUUID()}`,
      description: "Awarded while ranked within a given position on the XP leaderboard.",
      category: "SPECIAL",
      rarity: "RARE",
      icon: "🥇",
      designConfig: { shape: "star", primaryColor: "#000000" },
      xpReward: 25,
      isDynamic,
    },
  });
  await prisma.achievement.create({
    data: {
      badgeId: badge.id,
      name: badge.name,
      description: badge.description,
      requirementType: "SPECIAL",
      requirementConfig: {
        conditions: [{ metric: "top_xp_rank", operator: "lte", value: topXpRankThreshold }],
      },
    },
  });
  return badge;
};

const findUserBadge = (userId: string, badgeId: string) =>
  prisma.userBadge.findUnique({ where: { userId_badgeId: { userId, badgeId } } });

describe("achievementService.recheckDynamicBadges", () => {
  it("awards a dynamic rank badge to the currently top-ranked creator", async () => {
    const [high, low] = await Promise.all([createCreator(), createCreator()]);
    await giveXp(high.id, 50_000_000);
    await giveXp(low.id, 1);

    await creatorLeaderboardService.runRecompute();
    const highRank = await rankOfTopXp(high.id);
    expect(highRank).not.toBeNull();

    const badge = await createRankBadge(highRank! + 1, { isDynamic: true });
    await achievementService.recheckDynamicBadges();

    const highUserBadge = await findUserBadge(high.id, badge.id);
    const lowUserBadge = await findUserBadge(low.id, badge.id);

    expect(highUserBadge?.isDynamicallyEligible).toBe(true);
    expect(lowUserBadge).toBeNull();
  });

  it("revokes eligibility, without deleting the row, when a badge holder drops out of rank", async () => {
    const [high, low] = await Promise.all([createCreator(), createCreator()]);
    await giveXp(high.id, 50_000_000);
    await giveXp(low.id, 1);

    await creatorLeaderboardService.runRecompute();
    const highRank = await rankOfTopXp(high.id);
    const badge = await createRankBadge(highRank! + 1, { isDynamic: true });
    await achievementService.recheckDynamicBadges();

    await giveXp(high.id, 1);
    await giveXp(low.id, 50_000_000);
    await creatorLeaderboardService.runRecompute();
    await achievementService.recheckDynamicBadges();

    const highUserBadge = await findUserBadge(high.id, badge.id);
    const lowUserBadge = await findUserBadge(low.id, badge.id);

    expect(highUserBadge).not.toBeNull();
    expect(highUserBadge?.isDynamicallyEligible).toBe(false);
    expect(lowUserBadge?.isDynamicallyEligible).toBe(true);
  });

  it("restores eligibility for an existing holder who re-qualifies, without granting XP twice", async () => {
    const creator = await createCreator();
    const rival = await createCreator();
    await giveXp(creator.id, 50_000_000);
    await giveXp(rival.id, 1);

    await creatorLeaderboardService.runRecompute();
    const rank = await rankOfTopXp(creator.id);
    const badge = await createRankBadge(rank! + 1, { isDynamic: true });
    await achievementService.recheckDynamicBadges();

    await giveXp(creator.id, 1);
    await giveXp(rival.id, 50_000_000);
    await creatorLeaderboardService.runRecompute();
    await achievementService.recheckDynamicBadges();

    await giveXp(creator.id, 50_000_000);
    await giveXp(rival.id, 1);
    await creatorLeaderboardService.runRecompute();
    await achievementService.recheckDynamicBadges();

    const userBadge = await findUserBadge(creator.id, badge.id);
    expect(userBadge?.isDynamicallyEligible).toBe(true);

    const xpTransactionCount = await prisma.xpTransaction.count({
      where: { userId: creator.id, relatedEntityId: badge.id },
    });
    expect(xpTransactionCount).toBe(1);
  });

  it("leaves a non-dynamic badge with the same rank condition untouched by the recheck job", async () => {
    const creator = await createCreator();
    await giveXp(creator.id, 50_000_000);

    await creatorLeaderboardService.runRecompute();
    const rank = await rankOfTopXp(creator.id);
    const badge = await createRankBadge(rank! + 1, { isDynamic: false });
    await achievementService.recheckDynamicBadges();

    const userBadge = await findUserBadge(creator.id, badge.id);
    expect(userBadge).toBeNull();
  });
});
