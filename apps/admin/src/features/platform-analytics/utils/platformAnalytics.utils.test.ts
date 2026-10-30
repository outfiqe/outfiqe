import { describe, expect, it } from "vitest";

import { SPEED_LIMITS } from "../constants/platformAnalytics.constants";
import {
  formatLayoutShift,
  formatPaintTime,
  formatSessionLength,
  toPageLabel,
  toSpeedDelta,
} from "./platformAnalytics.utils";

describe("toPageLabel", () => {
  it("prefers the product name and falls back to the path", () => {
    expect(toPageLabel({ path: "/product/1", productName: "Linen kurta", count: 1 })).toBe(
      "Linen kurta",
    );
    expect(toPageLabel({ path: "/login", productName: null, count: 1 })).toBe("/login");
  });
});

describe("formatSessionLength", () => {
  it("shows seconds alone under a minute, and minutes with seconds above", () => {
    expect(formatSessionLength(0)).toBe("0s");
    expect(formatSessionLength(45.4)).toBe("45s");
    expect(formatSessionLength(221)).toBe("3m 41s");
  });
});

describe("formatPaintTime", () => {
  it("uses milliseconds under a second and seconds above", () => {
    expect(formatPaintTime(88.4)).toBe("88 ms");
    expect(formatPaintTime(2284)).toBe("2.28 s");
  });

  it("says when nothing was measured", () => {
    expect(formatPaintTime(null)).toBe("Not measured");
  });
});

describe("formatLayoutShift", () => {
  it("shows two decimals, or says nothing was measured", () => {
    expect(formatLayoutShift(0.0087)).toBe("0.01");
    expect(formatLayoutShift(null)).toBe("Not measured");
  });
});

describe("toSpeedDelta", () => {
  const limits = SPEED_LIMITS.LARGEST_CONTENTFUL_PAINT_MS;

  it("rates a measurement against its limits, inclusive of each limit", () => {
    expect(toSpeedDelta(2500, limits, "LCP")).toEqual({
      value: "Good",
      tone: "positive",
      label: "LCP",
    });
    expect(toSpeedDelta(4000, limits, "LCP")).toEqual({ value: "Needs work", label: "LCP" });
    expect(toSpeedDelta(4001, limits, "LCP")).toEqual({
      value: "Poor",
      tone: "negative",
      label: "LCP",
    });
  });

  it("doesn't rate what wasn't measured", () => {
    expect(toSpeedDelta(null, limits, "LCP")).toEqual({ value: "Not measured", label: "LCP" });
  });
});
