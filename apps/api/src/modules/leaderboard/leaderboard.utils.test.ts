import { describe, expect, it } from "vitest";

import { LEADERBOARD_CATEGORY } from "#constants/leaderboard.constants.js";

import { FASTEST_GROWING_SURGE_SCORE } from "./leaderboard.constants.js";
import { formatScoreLabel } from "./leaderboard.utils.js";

describe("formatScoreLabel", () => {
  it("formats TRENDING as points", () => {
    expect(formatScoreLabel(LEADERBOARD_CATEGORY.TRENDING, 42)).toBe("42 pts");
  });

  it("formats MOST_PURCHASED as units sold", () => {
    expect(formatScoreLabel(LEADERBOARD_CATEGORY.MOST_PURCHASED, 214)).toBe("214 sold");
  });

  it("formats MOST_LOVED as new followers", () => {
    expect(formatScoreLabel(LEADERBOARD_CATEGORY.MOST_LOVED, 7)).toBe("7 new followers");
  });

  it("formats a real FASTEST_GROWING score as a signed percentage", () => {
    expect(formatScoreLabel(LEADERBOARD_CATEGORY.FASTEST_GROWING, 184)).toBe("+184%");
  });

  it("formats a negative FASTEST_GROWING score without a leading plus", () => {
    expect(formatScoreLabel(LEADERBOARD_CATEGORY.FASTEST_GROWING, -32)).toBe("-32%");
  });

  it("shows New instead of the raw surge score for a brand with no prior week to compare against", () => {
    expect(
      formatScoreLabel(LEADERBOARD_CATEGORY.FASTEST_GROWING, FASTEST_GROWING_SURGE_SCORE),
    ).toBe("New");
  });
});
