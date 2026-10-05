import { PUBLIC_BUILD_SORT } from "@outfiqe/utils";
import { describe, expect, it } from "vitest";

import {
  clearNarrowingFilters,
  findSelectedPriceRange,
  hasNarrowingFilters,
  PRICE_RANGE,
  PRICE_RANGE_BOUNDS,
} from "./publicBuildFilters";

describe("price ranges", () => {
  it("never lets two ranges share a boundary price", () => {
    expect(PRICE_RANGE_BOUNDS[PRICE_RANGE.UNDER_5K]).toEqual({
      minPrice: undefined,
      maxPrice: 4_999,
    });
    expect(PRICE_RANGE_BOUNDS[PRICE_RANGE.FROM_5K_TO_10K]).toEqual({
      minPrice: 5_000,
      maxPrice: 9_999,
    });
    expect(PRICE_RANGE_BOUNDS[PRICE_RANGE.OVER_10K]).toEqual({
      minPrice: 10_000,
      maxPrice: undefined,
    });
  });

  it("finds the range that matches the chosen bounds, or none", () => {
    expect(findSelectedPriceRange({})).toBe(PRICE_RANGE.ANY);
    expect(findSelectedPriceRange({ minPrice: 5_000, maxPrice: 9_999 })).toBe(
      PRICE_RANGE.FROM_5K_TO_10K,
    );
    expect(findSelectedPriceRange({ minPrice: 1_234 })).toBeNull();
  });
});

describe("narrowing filters", () => {
  it("counts style, price and stock as narrowing, but not the sort order", () => {
    expect(hasNarrowingFilters({ sort: PUBLIC_BUILD_SORT.PRICE_LOW })).toBe(false);
    expect(hasNarrowingFilters({ isInStockOnly: false })).toBe(false);
    expect(hasNarrowingFilters({ category: "festive" })).toBe(true);
    expect(hasNarrowingFilters({ maxPrice: 4_999 })).toBe(true);
    expect(hasNarrowingFilters({ isInStockOnly: true })).toBe(true);
  });

  it("clears everything that narrows the feed and keeps the sort order", () => {
    expect(
      clearNarrowingFilters({
        category: "festive",
        minPrice: 10_000,
        isInStockOnly: true,
        sort: PUBLIC_BUILD_SORT.MOST_CHERIQED,
      }),
    ).toEqual({ sort: PUBLIC_BUILD_SORT.MOST_CHERIQED });
  });
});
