import { describe, expect, it } from "vitest";

import type { LevelRecord } from "./xp.types.js";
import {
  computeLevelProgress,
  hasReachedDailyLimit,
  hasReachedMaxPerEntity,
  isWithinCooldown,
  xpToNextLevel,
} from "./xp.utils.js";

const LEVELS_DESC: LevelRecord[] = [
  { id: "l8", level: 8, name: "Fashion Legend", requiredXp: 10000, icon: null },
  { id: "l7", level: 7, name: "Fashion Icon", requiredXp: 6000, icon: null },
  { id: "l2", level: 2, name: "Fashion Explorer", requiredXp: 100, icon: null },
  { id: "l1", level: 1, name: "Newcomer", requiredXp: 0, icon: null },
];

describe("computeLevelProgress", () => {
  it("resolves the newcomer floor level for a brand-new user", () => {
    const progress = computeLevelProgress(0, LEVELS_DESC);

    expect(progress.level.id).toBe("l1");
    expect(progress.nextLevel?.id).toBe("l2");
  });

  it("resolves the highest level whose requiredXp has been reached", () => {
    const progress = computeLevelProgress(6500, LEVELS_DESC);

    expect(progress.level.id).toBe("l7");
    expect(progress.nextLevel?.id).toBe("l8");
  });

  it("returns no next level once the top level is reached", () => {
    const progress = computeLevelProgress(50000, LEVELS_DESC);

    expect(progress.level.id).toBe("l8");
    expect(progress.nextLevel).toBeNull();
  });

  it("throws when no floor level exists in the configured ladder", () => {
    expect(() => computeLevelProgress(0, [])).toThrow();
  });
});

describe("xpToNextLevel", () => {
  it("returns the XP gap to the next level", () => {
    expect(xpToNextLevel(80, { id: "l2", level: 2, name: "x", requiredXp: 100, icon: null })).toBe(
      20,
    );
  });

  it("returns null when there is no next level", () => {
    expect(xpToNextLevel(50000, null)).toBeNull();
  });
});

describe("hasReachedMaxPerEntity", () => {
  it("returns false when no cap is configured", () => {
    expect(hasReachedMaxPerEntity(5, null)).toBe(false);
  });

  it("returns true once the existing count meets the cap", () => {
    expect(hasReachedMaxPerEntity(1, 1)).toBe(true);
  });

  it("returns false while still under the cap", () => {
    expect(hasReachedMaxPerEntity(0, 1)).toBe(false);
  });
});

describe("isWithinCooldown", () => {
  const now = new Date("2026-08-19T12:00:00.000Z");

  it("returns false when no cooldown is configured", () => {
    expect(isWithinCooldown(new Date("2026-08-19T11:59:59.000Z"), null, now)).toBe(false);
  });

  it("returns false when there is no prior award", () => {
    expect(isWithinCooldown(null, 60, now)).toBe(false);
  });

  it("returns true while still inside the cooldown window", () => {
    expect(isWithinCooldown(new Date("2026-08-19T11:59:30.000Z"), 60, now)).toBe(true);
  });

  it("returns false once the cooldown window has elapsed", () => {
    expect(isWithinCooldown(new Date("2026-08-19T11:58:00.000Z"), 60, now)).toBe(false);
  });
});

describe("hasReachedDailyLimit", () => {
  it("returns false when no daily limit is configured", () => {
    expect(hasReachedDailyLimit(1000, 10, null)).toBe(false);
  });

  it("returns false when the award stays within the daily limit", () => {
    expect(hasReachedDailyLimit(90, 10, 100)).toBe(false);
  });

  it("returns true once the award would exceed the daily limit", () => {
    expect(hasReachedDailyLimit(95, 10, 100)).toBe(true);
  });
});
