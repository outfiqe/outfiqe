import { describe, expect, it } from "vitest";

import {
  readCountAt,
  readFirstRowCounts,
  readFirstRowMeasurements,
  readLabelledCounts,
  toFunnelSteps,
  toProductIdFromPath,
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

describe("readFirstRowMeasurements", () => {
  it("keeps a missing measurement as null, not zero", () => {
    expect(readFirstRowMeasurements([[19, 2284, null]])).toEqual([19, 2284, null]);
  });

  it("is empty when PostHog returned no rows", () => {
    expect(readFirstRowMeasurements([])).toEqual([]);
  });
});

describe("toProductIdFromPath", () => {
  const productId = "4e36b676-1951-4f2f-903c-b9a51104b65c";

  it("finds the product id in a product page path, with or without a trailing slash", () => {
    expect(toProductIdFromPath(`/product/${productId}`)).toBe(productId);
    expect(toProductIdFromPath(`/product/${productId}/`)).toBe(productId);
  });

  it("ignores other pages and ids that aren't real", () => {
    expect(toProductIdFromPath("/")).toBeNull();
    expect(toProductIdFromPath("/product/not-a-real-id")).toBeNull();
    expect(toProductIdFromPath(`/product/${productId}/reviews`)).toBeNull();
  });
});
