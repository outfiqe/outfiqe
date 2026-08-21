import { describe, expect, it } from "vitest";

import type { AchievementCondition, AchievementConditionNode } from "./achievement.schemas.js";
import type { MetricSnapshot } from "./achievement.types.js";
import {
  areAllConditionsMet,
  collectLeafConditions,
  currentValueForCondition,
  evaluateConditionNode,
  isConditionLeaf,
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

describe("isConditionLeaf", () => {
  it("returns true for a plain metric/operator/value condition", () => {
    expect(isConditionLeaf(condition("level", "gte", 5))).toBe(true);
  });

  it("returns false for an AND/OR/NOT group node", () => {
    expect(isConditionLeaf({ type: "AND", conditions: [condition("level", "gte", 5)] })).toBe(
      false,
    );
    expect(isConditionLeaf({ type: "OR", conditions: [condition("level", "gte", 5)] })).toBe(false);
    expect(isConditionLeaf({ type: "NOT", condition: condition("level", "gte", 5) })).toBe(false);
  });
});

describe("evaluateConditionNode", () => {
  it("evaluates a bare leaf directly", () => {
    expect(evaluateConditionNode(condition("level", "gte", 5), { level: 5 })).toBe(true);
    expect(evaluateConditionNode(condition("level", "gte", 5), { level: 4 })).toBe(false);
  });

  it("AND requires every child to pass", () => {
    const node: AchievementConditionNode = {
      type: "AND",
      conditions: [condition("comments_made", "gte", 100), condition("level", "gte", 5)],
    };

    expect(evaluateConditionNode(node, { comments_made: 120, level: 6 })).toBe(true);
    expect(evaluateConditionNode(node, { comments_made: 120, level: 4 })).toBe(false);
  });

  it("OR requires only one child to pass", () => {
    const node: AchievementConditionNode = {
      type: "OR",
      conditions: [condition("total_likes", "gte", 1000), condition("total_views", "gte", 10000)],
    };

    expect(evaluateConditionNode(node, { total_likes: 0, total_views: 20000 })).toBe(true);
    expect(evaluateConditionNode(node, { total_likes: 1500, total_views: 0 })).toBe(true);
    expect(evaluateConditionNode(node, { total_likes: 0, total_views: 0 })).toBe(false);
  });

  it("NOT inverts its single child", () => {
    const node: AchievementConditionNode = {
      type: "NOT",
      condition: condition("level", "gte", 10),
    };

    expect(evaluateConditionNode(node, { level: 5 })).toBe(true);
    expect(evaluateConditionNode(node, { level: 10 })).toBe(false);
  });

  it("evaluates an arbitrarily nested tree: (likes >= 1000 OR views >= 10000) AND NOT banned", () => {
    const node: AchievementConditionNode = {
      type: "AND",
      conditions: [
        {
          type: "OR",
          conditions: [
            condition("total_likes", "gte", 1000),
            condition("total_views", "gte", 10000),
          ],
        },
        { type: "NOT", condition: condition("level", "eq", 0) },
      ],
    };

    expect(evaluateConditionNode(node, { total_likes: 1500, total_views: 0, level: 3 })).toBe(true);
    expect(evaluateConditionNode(node, { total_likes: 0, total_views: 0, level: 3 })).toBe(false);
    expect(evaluateConditionNode(node, { total_likes: 1500, total_views: 0, level: 0 })).toBe(
      false,
    );
  });
});

describe("areAllConditionsMet", () => {
  it("returns true only when every top-level condition passes (backward-compatible flat AND)", () => {
    const conditions = [condition("comments_made", "gte", 100), condition("level", "gte", 5)];

    expect(areAllConditionsMet(conditions, { comments_made: 120, level: 6 })).toBe(true);
    expect(areAllConditionsMet(conditions, { comments_made: 120, level: 4 })).toBe(false);
    expect(areAllConditionsMet(conditions, { comments_made: 50, level: 6 })).toBe(false);
  });

  it("returns true for an empty condition list", () => {
    expect(areAllConditionsMet([], {})).toBe(true);
  });

  it("treats a top-level array as an implicit AND whose elements can themselves be groups", () => {
    const conditions: AchievementConditionNode[] = [
      condition("level", "gte", 5),
      {
        type: "OR",
        conditions: [condition("total_likes", "gte", 1000), condition("sales_count", "gte", 10)],
      },
    ];

    expect(areAllConditionsMet(conditions, { level: 5, total_likes: 0, sales_count: 12 })).toBe(
      true,
    );
    expect(areAllConditionsMet(conditions, { level: 4, total_likes: 0, sales_count: 12 })).toBe(
      false,
    );
    expect(areAllConditionsMet(conditions, { level: 5, total_likes: 0, sales_count: 0 })).toBe(
      false,
    );
  });
});

describe("collectLeafConditions", () => {
  it("returns a flat array unchanged when every top-level node is already a leaf", () => {
    const conditions = [condition("comments_made", "gte", 100), condition("level", "gte", 5)];

    expect(collectLeafConditions(conditions)).toEqual(conditions);
  });

  it("flattens leaves out of nested AND/OR/NOT groups", () => {
    const conditions: AchievementConditionNode[] = [
      condition("level", "gte", 5),
      {
        type: "AND",
        conditions: [
          {
            type: "OR",
            conditions: [
              condition("total_likes", "gte", 1000),
              condition("total_views", "gte", 10000),
            ],
          },
          { type: "NOT", condition: condition("sales_count", "eq", 0) },
        ],
      },
    ];

    expect(collectLeafConditions(conditions)).toEqual([
      condition("level", "gte", 5),
      condition("total_likes", "gte", 1000),
      condition("total_views", "gte", 10000),
      condition("sales_count", "eq", 0),
    ]);
  });

  it("returns an empty array for an empty condition list", () => {
    expect(collectLeafConditions([])).toEqual([]);
  });
});
