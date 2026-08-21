import { describe, expect, it } from "vitest";

import { CreatorLeaderboardCategory } from "#generated/prisma/enums.js";

import type { CreatorStatsRow } from "./creatorLeaderboard.types.js";
import {
  deriveGrowthScore,
  formatCreatorScoreLabel,
  scoreForCategory,
  toZsetMembers,
} from "./creatorLeaderboard.utils.js";

const stats = (overrides: Partial<CreatorStatsRow> = {}): CreatorStatsRow => ({
  creatorId: "creator-1",
  totalXp: 500,
  followerCount: 20,
  totalLikes: 300,
  totalEngagement: 450,
  totalSales: 5000,
  achievementCount: 4,
  ...overrides,
});

describe("scoreForCategory", () => {
  it("TOP_XP is the creator's raw totalXp", () => {
    expect(scoreForCategory(CreatorLeaderboardCategory.TOP_XP, stats({ totalXp: 500 }))).toBe(500);
  });

  it("TOP_CREATOR combines totalXp with a weighted follower count", () => {
    const score = scoreForCategory(
      CreatorLeaderboardCategory.TOP_CREATOR,
      stats({ totalXp: 500, followerCount: 20 }),
    );
    expect(score).toBe(500 + 20 * 10);
  });

  it("MOST_LIKES is the creator's totalLikes", () => {
    expect(
      scoreForCategory(CreatorLeaderboardCategory.MOST_LIKES, stats({ totalLikes: 300 })),
    ).toBe(300);
  });

  it("MOST_ENGAGED is the creator's totalEngagement", () => {
    expect(
      scoreForCategory(CreatorLeaderboardCategory.MOST_ENGAGED, stats({ totalEngagement: 450 })),
    ).toBe(450);
  });

  it("TOP_SELLER is the creator's totalSales", () => {
    expect(
      scoreForCategory(CreatorLeaderboardCategory.TOP_SELLER, stats({ totalSales: 5000 })),
    ).toBe(5000);
  });

  it("MOST_ACHIEVEMENTS is the creator's achievementCount", () => {
    expect(
      scoreForCategory(
        CreatorLeaderboardCategory.MOST_ACHIEVEMENTS,
        stats({ achievementCount: 4 }),
      ),
    ).toBe(4);
  });

  it("RISING_CREATOR isn't derived from a single stats snapshot", () => {
    expect(scoreForCategory(CreatorLeaderboardCategory.RISING_CREATOR, stats())).toBe(0);
  });
});

describe("deriveGrowthScore", () => {
  it("computes a percentage change when there's a previous score to compare against", () => {
    expect(deriveGrowthScore(150, 100)).toBe(50);
    expect(deriveGrowthScore(50, 100)).toBe(-50);
  });

  it("returns the surge score for a creator with no previous-week score", () => {
    expect(deriveGrowthScore(200, 0)).toBe(999);
  });
});

describe("formatCreatorScoreLabel", () => {
  it.each([
    [CreatorLeaderboardCategory.TOP_XP, 1234, "1,234 XP"],
    [CreatorLeaderboardCategory.TOP_CREATOR, 500, "500 pts"],
    [CreatorLeaderboardCategory.MOST_LIKES, 42, "42 likes"],
    [CreatorLeaderboardCategory.MOST_ENGAGED, 99, "99 interactions"],
    [CreatorLeaderboardCategory.TOP_SELLER, 25000, "Rs. 25,000 earned"],
    [CreatorLeaderboardCategory.MOST_ACHIEVEMENTS, 7, "7 badges"],
  ])("%s formats %d as %s", (category, score, expected) => {
    expect(formatCreatorScoreLabel(category, score)).toBe(expected);
  });

  it("RISING_CREATOR formats a positive growth score with a leading plus", () => {
    expect(formatCreatorScoreLabel(CreatorLeaderboardCategory.RISING_CREATOR, 25)).toBe("+25%");
  });

  it("RISING_CREATOR formats a negative growth score without a double sign", () => {
    expect(formatCreatorScoreLabel(CreatorLeaderboardCategory.RISING_CREATOR, -10)).toBe("-10%");
  });
});

describe("toZsetMembers", () => {
  it("pairs up a flat [member, score, member, score, ...] array", () => {
    expect(toZsetMembers(["creator-1", "10", "creator-2", "5"])).toEqual([
      { member: "creator-1", score: 10 },
      { member: "creator-2", score: 5 },
    ]);
  });

  it("returns an empty array for no entries", () => {
    expect(toZsetMembers([])).toEqual([]);
  });
});
