import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { CreatorStatus } from "#generated/prisma/enums.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

import type { AchievementConditionNode } from "./achievement.schemas.js";
import { achievementService } from "./achievement.service.js";

const createUser = async () =>
  prisma.user.create({
    data: {
      email: `nested-condition-${randomUUID()}@outfiqe.test`,
      name: "Nested Condition Tester",
      handle: `nested-condition-${randomUUID().slice(0, 8)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      isCreator: true,
      creatorStatus: CreatorStatus.APPROVED,
    },
  });

const giveUserLikesAndViews = async (userId: string, likeCount: number, viewCount: number) =>
  prisma.creatorLook.create({
    data: {
      creatorId: userId,
      imageUrl: "https://example.test/look.jpg",
      likeCount,
      viewCount,
    },
  });

const nestedTree: AchievementConditionNode[] = [
  {
    type: "AND",
    conditions: [
      {
        type: "OR",
        conditions: [
          { metric: "total_likes", operator: "gte", value: 1000 },
          { metric: "total_views", operator: "gte", value: 10000 },
        ],
      },
      { type: "NOT", condition: { metric: "level", operator: "gte", value: 100 } },
    ],
  },
];

const createNestedAchievement = async () => {
  const badge = await prisma.badge.create({
    data: {
      name: `Nested Condition Badge ${randomUUID()}`,
      description: "A badge whose rule is a nested AND/OR/NOT tree.",
      category: "ENGAGEMENT",
      rarity: "RARE",
      icon: "🌲",
      designConfig: { shape: "hexagon", primaryColor: "#000000" },
      xpReward: 25,
    },
  });

  const achievement = await prisma.achievement.create({
    data: {
      badgeId: badge.id,
      name: badge.name,
      description: badge.description,
      requirementType: "ENGAGEMENT",
      requirementConfig: { conditions: nestedTree },
    },
  });

  return { badge, achievement };
};

describe("achievementService.evaluateForUser with a nested condition tree", () => {
  it("unlocks when (likes OR views) is satisfied and NOT-level holds", async () => {
    const user = await createUser();
    const { badge } = await createNestedAchievement();
    await giveUserLikesAndViews(user.id, 1500, 0);

    const unlocked = await achievementService.evaluateForUser(user.id);

    expect(unlocked.map((achievement) => achievement.badgeId)).toContain(badge.id);
    const userBadge = await prisma.userBadge.findUnique({
      where: { userId_badgeId: { userId: user.id, badgeId: badge.id } },
    });
    expect(userBadge).not.toBeNull();
  });

  it("does not unlock when neither branch of the OR is satisfied", async () => {
    const user = await createUser();
    const { badge } = await createNestedAchievement();
    await giveUserLikesAndViews(user.id, 0, 0);

    const unlocked = await achievementService.evaluateForUser(user.id);

    expect(unlocked.map((achievement) => achievement.badgeId)).not.toContain(badge.id);
    const userBadge = await prisma.userBadge.findUnique({
      where: { userId_badgeId: { userId: user.id, badgeId: badge.id } },
    });
    expect(userBadge).toBeNull();
  });
});

describe("achievementService.listProgressForUser with a nested condition tree", () => {
  it("flattens the tree into its leaf conditions with current values", async () => {
    const user = await createUser();
    await createNestedAchievement();
    await giveUserLikesAndViews(user.id, 250, 40);

    const [progress] = await achievementService.listProgressForUser(user.id);

    expect(progress).toBeDefined();
    expect(progress!.conditions).toHaveLength(3);
    expect(progress!.conditions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ metric: "total_likes", currentValue: 250 }),
        expect.objectContaining({ metric: "total_views", currentValue: 40 }),
        expect.objectContaining({ metric: "level", currentValue: 1 }),
      ]),
    );
  });
});
