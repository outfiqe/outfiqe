import { describe, expect, it } from "vitest";

import { toOverviewPeriodDays, toOverviewRange } from "./overviewPeriod";

describe("toOverviewPeriodDays", () => {
  it("reads a range from the link", () => {
    expect(toOverviewPeriodDays("7d")).toBe(7);
    expect(toOverviewPeriodDays("90d")).toBe(90);
  });

  it("falls back to 30 days for a missing or made-up range", () => {
    expect(toOverviewPeriodDays(null)).toBe(30);
    expect(toOverviewPeriodDays("5d")).toBe(30);
    expect(toOverviewPeriodDays(["7d", "90d"])).toBe(30);
  });
});

describe("toOverviewRange", () => {
  it("writes days the way the link shows them", () => {
    expect(toOverviewRange(90)).toBe("90d");
  });
});
