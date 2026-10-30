import { describe, expect, it } from "vitest";

import {
  readCountAt,
  readFirstRowCounts,
  readLabelledCounts,
  toFunnelSteps,
  toShare,
} from "./insights.utils.js";

describe("readFirstRowCounts", () => {
  it("reads the numbers in the first row, even when PostHog sends them as strings", () => {
    expect(readFirstRowCounts([[12, "7", 3]])).toEqual([12, 7, 3]);
  });

  it("returns nothing for an empty result", () => {
    expect(readFirstRowCounts([])).toEqual([]);
  });
});

describe("readCountAt", () => {
  it("falls back to zero for a missing column", () => {
    expect(readCountAt([4], 3)).toBe(0);
  });
});

describe("readLabelledCounts", () => {
  it("pairs each label with its count and skips rows with no label", () => {
    expect(
      readLabelledCounts([
        ["cod", 9],
        [null, 2],
        ["esewa", "4"],
      ]),
    ).toEqual([
      { label: "cod", count: 9 },
      { label: "esewa", count: 4 },
    ]);
  });
});

describe("toFunnelSteps", () => {
  it("keeps the funnel's step order and fills steps nobody reached with zero", () => {
    const steps = toFunnelSteps(
      ["product:detail_view", "cart:item_add", "checkout:order_place"],
      [
        ["checkout:order_place", 3],
        ["product:detail_view", 40],
      ],
    );

    expect(steps).toEqual([
      { event: "product:detail_view", persons: 40 },
      { event: "cart:item_add", persons: 0 },
      { event: "checkout:order_place", persons: 3 },
    ]);
  });
});

describe("toShare", () => {
  it("divides the part by the whole", () => {
    expect(toShare(3, 12)).toBe(0.25);
  });

  it("is zero, not NaN, when there is nothing to divide by", () => {
    expect(toShare(0, 0)).toBe(0);
  });
});
