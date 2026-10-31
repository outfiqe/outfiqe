import { describe, expect, it } from "vitest";

import type { TrendDebugSnapshot } from "../api/trendingSchemas";
import {
  countRecentActions,
  describeChange,
  describeFreshnessBoost,
  describeTrendVerdict,
  listMissingSignalTips,
} from "./trending.utils";

const NO_ACTIVITY = { purchaseUnits: 0, cartAdds: 0, saves: 0, creatorTags: 0, tagClicks: 0 };

const buildSnapshot = (overrides: Partial<TrendDebugSnapshot> = {}): TrendDebugSnapshot => ({
  productId: "product-1",
  brandId: "brand-1",
  recentActivity: NO_ACTIVITY,
  decayedActivity: 0,
  previousWindowActivity: 0,
  velocity: 0,
  baseline: { source: "global", value: 3.47 },
  baselineLift: 0,
  momentum: 0,
  freshnessMultiplier: 1,
  score: 0,
  rank: null,
  scoredAt: "2026-10-31T10:00:00.000Z",
  dailyActivity: [],
  ...overrides,
});

describe("describeTrendVerdict", () => {
  it("says why a quiet product isn't trending", () => {
    expect(describeTrendVerdict(buildSnapshot())).toMatchObject({
      tone: "neutral",
      headline: "Not trending",
    });
  });

  it("says when there was some activity but not enough", () => {
    const { headline, detail } = describeTrendVerdict(
      buildSnapshot({ recentActivity: { ...NO_ACTIVITY, cartAdds: 1 } }),
    );

    expect(headline).toBe("Not trending yet");
    expect(detail).toContain("1 shopper action");
  });

  it("gives the position of a trending product", () => {
    const { tone, headline, detail } = describeTrendVerdict(
      buildSnapshot({ rank: 3, recentActivity: { ...NO_ACTIVITY, saves: 2, cartAdds: 3 } }),
    );

    expect(tone).toBe("success");
    expect(headline).toBe("Trending at #3");
    expect(detail).toContain("5 shopper actions");
  });

  it("explains a trending product with a quiet last 6 hours", () => {
    expect(describeTrendVerdict(buildSnapshot({ rank: 1 })).detail).toContain("earlier days");
  });
});

describe("describeChange", () => {
  it.each([
    [0, "No activity"],
    [1, "About the same"],
    [2.5, "2.5× busier"],
    [0.5, "Quieter"],
  ])("reads %s as %s", (ratio, label) => {
    expect(describeChange(ratio)).toBe(label);
  });
});

describe("describeFreshnessBoost", () => {
  it("shows the boost as a percentage, or none", () => {
    expect(describeFreshnessBoost(1.15)).toBe("+15%");
    expect(describeFreshnessBoost(1)).toBe("None");
  });
});

describe("listMissingSignalTips", () => {
  it("lists only what is missing, most valuable first", () => {
    const tips = listMissingSignalTips({ ...NO_ACTIVITY, cartAdds: 2 });

    expect(tips[0]).toContain("No purchases");
    expect(tips).toHaveLength(4);
    expect(tips.join(" ")).not.toContain("cart");
  });

  it("adds up every kind of action", () => {
    expect(countRecentActions({ ...NO_ACTIVITY, saves: 2, tagClicks: 3 })).toBe(5);
  });
});
