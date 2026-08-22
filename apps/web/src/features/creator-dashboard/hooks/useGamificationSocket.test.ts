import { describe, expect, it } from "vitest";

import type { AchievementUnlockedPayload } from "../socketEvents";
import { formatAchievementToast } from "./useGamificationSocket";

const basePayload: AchievementUnlockedPayload = {
  badgeId: "badge-1",
  badgeName: "Trailblazer",
  badgeIcon: "🏆",
  xpReward: 50,
  sponsorBrandName: null,
};

describe("formatAchievementToast", () => {
  it("formats an unlock with xp and no sponsor credit", () => {
    expect(formatAchievementToast(basePayload)).toBe(
      "🏆 Achievement unlocked: Trailblazer! +50 XP",
    );
  });

  it("omits the xp clause when the reward is zero", () => {
    expect(formatAchievementToast({ ...basePayload, xpReward: 0 })).toBe(
      "🏆 Achievement unlocked: Trailblazer!",
    );
  });

  it("appends a sponsor credit when the badge is brand-sponsored", () => {
    expect(formatAchievementToast({ ...basePayload, sponsorBrandName: "Nike" })).toBe(
      "🏆 Achievement unlocked: Trailblazer! +50 XP (sponsored by Nike)",
    );
  });
});
