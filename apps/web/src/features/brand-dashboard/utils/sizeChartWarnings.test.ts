import { describe, expect, it } from "vitest";

import { findSizeChartWarnings } from "./sizeChartWarnings";

const MEDIUM = { minHeightCm: 160, maxHeightCm: 170, minWeightKg: 55, maxWeightKg: 65 };

describe("findSizeChartWarnings", () => {
  it("has nothing to say about neighbouring sizes that meet or overlap a little", () => {
    expect(
      findSizeChartWarnings([
        { label: "M", fitRange: MEDIUM },
        {
          label: "L",
          fitRange: { minHeightCm: 170, maxHeightCm: 180, minWeightKg: 66, maxWeightKg: 75 },
        },
      ]),
    ).toEqual([]);
  });

  it("points out a height gap and a weight gap between neighbouring sizes", () => {
    expect(
      findSizeChartWarnings([
        { label: "M", fitRange: MEDIUM },
        {
          label: "L",
          fitRange: { minHeightCm: 175, maxHeightCm: 185, minWeightKg: 70, maxWeightKg: 80 },
        },
      ]),
    ).toEqual([
      "Nobody between 171 and 174 cm gets a fitting size: M ends before L starts.",
      "Nobody between 66 and 69 kg gets a fitting size: M ends before L starts.",
    ]);
  });

  it("points out a size whose range sits inside its neighbour's", () => {
    expect(
      findSizeChartWarnings([
        { label: "M", fitRange: MEDIUM },
        {
          label: "L",
          fitRange: { minHeightCm: 162, maxHeightCm: 168, minWeightKg: 57, maxWeightKg: 63 },
        },
      ]),
    ).toEqual(["M and L cover the same people, so shoppers can't tell them apart."]);
  });

  it("skips sizes without a range when comparing neighbours", () => {
    expect(
      findSizeChartWarnings([
        { label: "M", fitRange: MEDIUM },
        { label: "M/L", fitRange: null },
        {
          label: "L",
          fitRange: { minHeightCm: 170, maxHeightCm: 180, minWeightKg: 65, maxWeightKg: 75 },
        },
      ]),
    ).toEqual([]);
  });
});
