import { describe, expect, it } from "vitest";

import { toFitColumns, toFitRange } from "./fit-range.utils.js";

const MEDIUM_FIT_RANGE = { minHeightCm: 160, maxHeightCm: 170, minWeightKg: 55, maxWeightKg: 65 };

describe("toFitRange", () => {
  it("builds a range when all four ends are stored", () => {
    expect(toFitRange(MEDIUM_FIT_RANGE)).toEqual(MEDIUM_FIT_RANGE);
  });

  it("returns null when any end is missing", () => {
    expect(toFitRange({ ...MEDIUM_FIT_RANGE, maxWeightKg: null })).toBeNull();
  });
});

describe("toFitColumns", () => {
  it("spreads a range into its four columns", () => {
    expect(toFitColumns(MEDIUM_FIT_RANGE)).toEqual(MEDIUM_FIT_RANGE);
  });

  it("clears all four columns for no range", () => {
    expect(toFitColumns(null)).toEqual({
      minHeightCm: null,
      maxHeightCm: null,
      minWeightKg: null,
      maxWeightKg: null,
    });
  });
});
