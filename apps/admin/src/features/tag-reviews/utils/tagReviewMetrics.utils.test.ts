import { describe, expect, it } from "vitest";

import {
  buildTrendDelta,
  formatDuration,
  formatPercent,
  judgeSpeed,
  pluralize,
} from "./tagReviewMetrics.utils";

describe("formatDuration", () => {
  it.each([
    [null, "—"],
    [0, "under a minute"],
    [0.5, "30 minutes"],
    [1, "1 hour"],
    [5.2, "5.2 hours"],
    [72, "3 days"],
    [165.6, "6.9 days"],
  ])("shows %s hours as %s", (hours, expected) => {
    expect(formatDuration(hours)).toBe(expected);
  });
});

describe("pluralize", () => {
  it("uses the singular only for one", () => {
    expect(pluralize(1, "tag")).toBe("1 tag");
    expect(pluralize(0, "tag")).toBe("0 tags");
    expect(pluralize(1200, "tag")).toBe("1,200 tags");
  });

  it("accepts an irregular plural", () => {
    expect(pluralize(2, "look has", "looks have")).toBe("2 looks have");
  });
});

describe("formatPercent", () => {
  it("shows a dash when there is no value", () => {
    expect(formatPercent(null)).toBe("—");
    expect(formatPercent(75)).toBe("75%");
  });
});

describe("judgeSpeed", () => {
  it("refuses to judge below the minimum sample or without a value", () => {
    expect(judgeSpeed(4, 100, 24)).toBe("TOO_FEW");
    expect(judgeSpeed(5, null, 24)).toBe("TOO_FEW");
  });

  it("treats the exact target as on target", () => {
    expect(judgeSpeed(5, 24, 24)).toBe("ON_TARGET");
    expect(judgeSpeed(5, 24.1, 24)).toBe("TOO_SLOW");
  });
});

describe("buildTrendDelta", () => {
  const trendOf = (deltaPercent: number | null) => ({
    value: 1,
    previousValue: 1,
    deltaPercent,
  });

  it("says when there is nothing to compare", () => {
    expect(buildTrendDelta(trendOf(null), "neutral").value).toBe("No earlier week to compare");
  });

  it("colours a change by whether it is good", () => {
    expect(buildTrendDelta(trendOf(10), "higherIsBetter").tone).toBe("positive");
    expect(buildTrendDelta(trendOf(10), "lowerIsBetter").tone).toBe("negative");
    expect(buildTrendDelta(trendOf(10), "neutral").tone).toBe("neutral");
    expect(buildTrendDelta(trendOf(0), "higherIsBetter").value).toBe("No change");
  });
});
