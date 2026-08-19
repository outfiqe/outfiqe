import { describe, expect, it } from "vitest";

import type { AchievementCondition } from "./achievement.schemas.js";
import type { MetricSnapshot } from "./achievement.types.js";
import {
  areAllConditionsMet,
  currentValueForCondition,
  isConditionMet,
} from "./achievement.utils.js";

const condition = (
  metric: AchievementCondition["metric"],
  operator: AchievementCondition["operator"],
  value: number,
): AchievementCondition => ({ metric, operator, value });

describe("currentValueForCondition", () => {
  it("returns the snapshot value for a metric present in the snapshot", () => {
    const snapshot: MetricSnapshot = { total_likes: 250 };
    expect(currentValueForCondition(condition("total_likes", "gte", 100), snapshot)).toBe(250);
  });

  it("defaults to 0 for a metric missing from the snapshot", () => {
    expect(currentValueForCondition(condition("total_likes", "gte", 100), {})).toBe(0);
  });
});

describe("isConditionMet", () => {
  it.each([
    ["gte", 10, 10, true],
    ["gte", 9, 10, false],
    ["gt", 11, 10, true],
    ["gt", 10, 10, false],
    ["eq", 10, 10, true],
    ["eq", 11, 10, false],
    ["lte", 10, 10, true],
    ["lte", 11, 10, false],
    ["lt", 9, 10, true],
    ["lt", 10, 10, false],
  ] as const)("%s: current=%d target=%d -> %s", (operator, currentValue, target, expected) => {
    const snapshot: MetricSnapshot = { total_likes: currentValue };
    expect(isConditionMet(condition("total_likes", operator, target), snapshot)).toBe(expected);
  });
});

describe("areAllConditionsMet", () => {
  it("returns true only when every condition passes", () => {
    const conditions = [condition("comments_made", "gte", 100), condition("level", "gte", 5)];

    expect(areAllConditionsMet(conditions, { comments_made: 120, level: 6 })).toBe(true);
    expect(areAllConditionsMet(conditions, { comments_made: 120, level: 4 })).toBe(false);
    expect(areAllConditionsMet(conditions, { comments_made: 50, level: 6 })).toBe(false);
  });

  it("returns true for an empty condition list", () => {
    expect(areAllConditionsMet([], {})).toBe(true);
  });
});
