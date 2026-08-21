import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { CreatorStatus } from "#generated/prisma/enums.js";

import { achievementRepository } from "./achievement.repository.js";

const uniquePhone = () => `98${randomUUID().replace(/\D/g, "1").slice(0, 8)}`;

const createUser = async () =>
  prisma.user.create({
    data: {
      email: `eligibility-${randomUUID()}@outfiqe.test`,
      name: "Eligibility Tester",
      handle: `eligibility-${randomUUID().slice(0, 8)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      isCreator: true,
      creatorStatus: CreatorStatus.APPROVED,
    },
  });

const createSeasonalAchievement = async (overrides: {
  isActive?: boolean;
  activeFrom?: Date | null;
  activeUntil?: Date | null;
}) => {
  const badge = await prisma.badge.create({
    data: {
      name: `Seasonal Badge ${randomUUID()}`,
      description: "A badge created for seasonal-window integration testing.",
      category: "SPECIAL",
      rarity: "EXCLUSIVE",
      icon: "🎃",
      designConfig: { shape: "hexagon", primaryColor: "#000000" },
    },
  });

  return prisma.achievement.create({
    data: {
      badgeId: badge.id,
      name: badge.name,
      description: badge.description,
      requirementType: "ENGAGEMENT",
      requirementConfig: {
        conditions: [{ metric: "total_likes", operator: "gte", value: 1 }],
      },
      isActive: overrides.isActive ?? true,
      activeFrom: overrides.activeFrom ?? null,
      activeUntil: overrides.activeUntil ?? null,
    },
  });
};

const ONE_HOUR_MS = 60 * 60 * 1000;

describe("achievementRepository.findEligibleAchievements", () => {
  it("includes an achievement with no seasonal window", async () => {
    const user = await createUser();
    const achievement = await createSeasonalAchievement({});

    const eligible = await achievementRepository.findEligibleAchievements(user.id);

    expect(eligible.map((row) => row.id)).toContain(achievement.id);
  });

  it("includes an achievement whose window is currently open", async () => {
    const user = await createUser();
    const achievement = await createSeasonalAchievement({
      activeFrom: new Date(Date.now() - ONE_HOUR_MS),
      activeUntil: new Date(Date.now() + ONE_HOUR_MS),
    });

    const eligible = await achievementRepository.findEligibleAchievements(user.id);

    expect(eligible.map((row) => row.id)).toContain(achievement.id);
  });

  it("excludes an achievement whose window hasn't opened yet", async () => {
    const user = await createUser();
    const achievement = await createSeasonalAchievement({
      activeFrom: new Date(Date.now() + ONE_HOUR_MS),
    });

    const eligible = await achievementRepository.findEligibleAchievements(user.id);

    expect(eligible.map((row) => row.id)).not.toContain(achievement.id);
  });

  it("excludes an achievement whose window has already closed", async () => {
    const user = await createUser();
    const achievement = await createSeasonalAchievement({
      activeUntil: new Date(Date.now() - ONE_HOUR_MS),
    });

    const eligible = await achievementRepository.findEligibleAchievements(user.id);

    expect(eligible.map((row) => row.id)).not.toContain(achievement.id);
  });

  it("excludes an achievement paused via isActive regardless of its window", async () => {
    const user = await createUser();
    const achievement = await createSeasonalAchievement({
      isActive: false,
      activeFrom: new Date(Date.now() - ONE_HOUR_MS),
      activeUntil: new Date(Date.now() + ONE_HOUR_MS),
    });

    const eligible = await achievementRepository.findEligibleAchievements(user.id);

    expect(eligible.map((row) => row.id)).not.toContain(achievement.id);
  });
});
