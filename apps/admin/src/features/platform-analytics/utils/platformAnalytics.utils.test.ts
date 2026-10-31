import { describe, expect, it } from "vitest";

import { SPEED_LIMITS } from "../constants/platformAnalytics.constants";
import {
  describeFunnelStep,
  findBiggestDrop,
  formatLayoutShift,
  formatPaintTime,
  formatSessionLength,
  toLedgerMethod,
  toPageLabel,
  toReadingsLabel,
  toSiteUrl,
  toSpeedRatingDelta,
  toTrafficSourceUrl,
} from "./platformAnalytics.utils";

describe("toPageLabel", () => {
  const page = { productName: null, brandName: null };

  it("prefers the product or brand name", () => {
    expect(toPageLabel({ ...page, path: "/product/1", productName: "Linen kurta" })).toBe(
      "Linen kurta",
    );
    expect(toPageLabel({ ...page, path: "/brand/1", brandName: "Everlane" })).toBe("Everlane");
  });

  it("names the well-known pages and muse profiles", () => {
    expect(toPageLabel({ ...page, path: "/" })).toBe("Homepage");
    expect(toPageLabel({ ...page, path: "/explore" })).toBe("Explore");
    expect(toPageLabel({ ...page, path: "/creator/asha" })).toBe("@asha");
    expect(toPageLabel({ ...page, path: "/manage-orders" })).toBe("Brand orders");
    expect(toPageLabel({ ...page, path: "/builds/a9f2e662" })).toBe("An outfit build");
  });

  it("falls back to the path", () => {
    expect(toPageLabel({ ...page, path: "/help/returns" })).toBe("/help/returns");
  });
});

describe("links", () => {
  it("opens pages on the site and traffic sources on their own site", () => {
    expect(toSiteUrl("/explore")).toMatch(/\/explore$/);
    expect(toTrafficSourceUrl("instagram.com")).toBe("https://instagram.com");
    expect(toTrafficSourceUrl("$direct")).toBeUndefined();
    expect(toLedgerMethod("cod")).toBe("COD");
  });
});

describe("findBiggestDrop", () => {
  it("finds the step that lost the most people", () => {
    const biggestDrop = findBiggestDrop([
      { event: "view", persons: 100 },
      { event: "cart", persons: 90 },
      { event: "checkout", persons: 20 },
      { event: "order", persons: 15 },
    ]);

    expect(biggestDrop).toEqual({ fromEvent: "cart", toEvent: "checkout", lostPeople: 70 });
  });

  it("has nothing to say when nobody left", () => {
    expect(
      findBiggestDrop([
        { event: "view", persons: 5 },
        { event: "cart", persons: 5 },
      ]),
    ).toBeNull();
  });
});

describe("describeFunnelStep", () => {
  it("says how many people stopped in plain words", () => {
    expect(describeFunnelStep(3, 8)).toBe("5 of 8 people stopped here.");
    expect(describeFunnelStep(1, 2)).toBe("1 of 2 people stopped here.");
    expect(describeFunnelStep(0, 1)).toBe("1 of 1 person stopped here.");
    expect(describeFunnelStep(8, 8)).toBe("Nobody left at this step.");
  });

  it("explains a step with more people than the one above", () => {
    expect(describeFunnelStep(3, 0)).toBe("Some people reached this step without the one above.");
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

  it("moves to seconds once rounding reaches a full second", () => {
    expect(formatPaintTime(999.6)).toBe("1.00 s");
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

describe("toSpeedRatingDelta", () => {
  const limits = SPEED_LIMITS.LARGEST_CONTENTFUL_PAINT_MS;
  const ENOUGH_READINGS = 50;

  it("rates a measurement against its limits, inclusive of each limit", () => {
    expect(toSpeedRatingDelta(2500, limits, ENOUGH_READINGS)).toEqual({
      value: "Good",
      tone: "positive",
    });
    expect(toSpeedRatingDelta(4000, limits, ENOUGH_READINGS)).toEqual({ value: "Needs work" });
    expect(toSpeedRatingDelta(4001, limits, ENOUGH_READINGS)).toEqual({
      value: "Poor",
      tone: "negative",
    });
  });

  it("doesn't rate what wasn't measured", () => {
    expect(toSpeedRatingDelta(null, limits, ENOUGH_READINGS)).toEqual({ value: "Not measured" });
  });

  it("doesn't judge from a handful of readings", () => {
    expect(toSpeedRatingDelta(9000, limits, 9)).toEqual({ value: "Too few readings to judge" });
  });
});

describe("toReadingsLabel", () => {
  it("counts readings", () => {
    expect(toReadingsLabel(1)).toBe("Based on 1 reading");
    expect(toReadingsLabel(1200)).toBe("Based on 1,200 readings");
  });
});
