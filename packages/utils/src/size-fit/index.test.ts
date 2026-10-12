import { describe, expect, it } from "vitest";

import {
  FIT_ALTERNATIVE_REASON,
  FIT_HEIGHT_CM_MAX,
  FIT_HEIGHT_CM_MIN,
  FIT_OUTCOME,
  FIT_WEIGHT_KG_MAX,
  FIT_WEIGHT_KG_MIN,
  type FitRange,
  type FitSizeCandidate,
  isFitRangeOrdered,
  isMeasurementWithinBounds,
  recommendFitSize,
} from "./index";

const buildSize = (label: string, fitRange: FitRange | null): FitSizeCandidate => ({
  sizeId: `size-${label}`,
  label,
  fitRange,
});

const letterChart = [
  buildSize("S", { minHeightCm: 150, maxHeightCm: 160, minWeightKg: 45, maxWeightKg: 55 }),
  buildSize("M", { minHeightCm: 160, maxHeightCm: 170, minWeightKg: 55, maxWeightKg: 65 }),
  buildSize("L", { minHeightCm: 170, maxHeightCm: 180, minWeightKg: 65, maxWeightKg: 75 }),
  buildSize("XL", { minHeightCm: 180, maxHeightCm: 190, minWeightKg: 75, maxWeightKg: 85 }),
];

const STRETCHABLE = true;
const NON_STRETCH = false;
const STRETCH_UNKNOWN = null;

describe("recommendFitSize", () => {
  describe("without a usable chart", () => {
    it("reports NO_CHART for a product with no sizes", () => {
      expect(recommendFitSize([], { heightCm: 165, weightKg: 60 }, NON_STRETCH)).toEqual({
        outcome: FIT_OUTCOME.NO_CHART,
      });
    });

    it("reports NO_CHART when no size has a range", () => {
      const unchartedSizes = [buildSize("S", null), buildSize("M", null)];
      expect(
        recommendFitSize(unchartedSizes, { heightCm: 165, weightKg: 60 }, NON_STRETCH),
      ).toEqual({ outcome: FIT_OUTCOME.NO_CHART });
    });

    it("ignores a size whose range is inverted", () => {
      const invertedSizes = [
        buildSize("M", { minHeightCm: 170, maxHeightCm: 160, minWeightKg: 55, maxWeightKg: 65 }),
      ];
      expect(recommendFitSize(invertedSizes, { heightCm: 165, weightKg: 60 }, NON_STRETCH)).toEqual(
        { outcome: FIT_OUTCOME.NO_CHART },
      );
    });
  });

  describe("when exactly one size fits", () => {
    it("recommends that size with no alternative", () => {
      expect(recommendFitSize(letterChart, { heightCm: 165, weightKg: 60 }, NON_STRETCH)).toEqual({
        outcome: FIT_OUTCOME.SINGLE,
        primary: { sizeId: "size-M", label: "M" },
        alternative: null,
        alternativeReason: null,
        isDecidedByStretch: false,
      });
    });

    it("suggests sizing up for room on a non-stretch piece at the top edge of the range", () => {
      const recommendation = recommendFitSize(
        letterChart,
        { heightCm: 169, weightKg: 64 },
        NON_STRETCH,
      );
      expect(recommendation).toMatchObject({
        outcome: FIT_OUTCOME.SINGLE,
        primary: { label: "M" },
        alternative: { label: "L" },
        alternativeReason: FIT_ALTERNATIVE_REASON.SIZE_UP_FOR_ROOM,
      });
    });

    it.each([
      ["stretchable", STRETCHABLE],
      ["of unknown stretch", STRETCH_UNKNOWN],
    ])("does not suggest sizing up when the piece is %s", (_description, isStretchable) => {
      expect(
        recommendFitSize(letterChart, { heightCm: 169, weightKg: 64 }, isStretchable),
      ).toMatchObject({ primary: { label: "M" }, alternative: null, alternativeReason: null });
    });

    it("does not suggest sizing up when the next size is more than one step away", () => {
      expect(
        recommendFitSize(letterChart, { heightCm: 169, weightKg: 60 }, NON_STRETCH),
      ).toMatchObject({ primary: { label: "M" }, alternative: null });
    });

    it("does not suggest sizing up from the largest size", () => {
      expect(
        recommendFitSize(letterChart, { heightCm: 189, weightKg: 84 }, NON_STRETCH),
      ).toMatchObject({ primary: { label: "XL" }, alternative: null });
    });

    it("treats a range with equal ends as fitting only that exact value", () => {
      const freeSize = [
        buildSize("Free", { minHeightCm: 160, maxHeightCm: 160, minWeightKg: 55, maxWeightKg: 55 }),
      ];
      expect(
        recommendFitSize(freeSize, { heightCm: 160, weightKg: 55 }, NON_STRETCH),
      ).toMatchObject({ outcome: FIT_OUTCOME.SINGLE, primary: { label: "Free" } });
    });
  });

  describe("when overlapping ranges make two sizes fit", () => {
    const overlappingChart = [
      buildSize("M", { minHeightCm: 160, maxHeightCm: 175, minWeightKg: 55, maxWeightKg: 70 }),
      buildSize("L", { minHeightCm: 165, maxHeightCm: 180, minWeightKg: 60, maxWeightKg: 75 }),
    ];

    it("prefers the size whose range centre is clearly closer", () => {
      expect(
        recommendFitSize(overlappingChart, { heightCm: 166, weightKg: 61 }, STRETCHABLE),
      ).toEqual({
        outcome: FIT_OUTCOME.SINGLE,
        primary: { sizeId: "size-M", label: "M" },
        alternative: { sizeId: "size-L", label: "L" },
        alternativeReason: FIT_ALTERNATIVE_REASON.ALSO_FITS,
        isDecidedByStretch: false,
      });
    });

    it.each([
      ["picks the smaller size for a stretchable piece", STRETCHABLE, "S", "M"],
      ["picks the larger size for a non-stretch piece", NON_STRETCH, "M", "S"],
      ["picks the larger size when stretch is unknown", STRETCH_UNKNOWN, "M", "S"],
    ])("%s on a near tie", (_description, isStretchable, primaryLabel, alternativeLabel) => {
      expect(
        recommendFitSize(letterChart, { heightCm: 160, weightKg: 55 }, isStretchable),
      ).toMatchObject({
        outcome: FIT_OUTCOME.SINGLE,
        primary: { label: primaryLabel },
        alternative: { label: alternativeLabel },
        alternativeReason: FIT_ALTERNATIVE_REASON.ALSO_FITS,
        isDecidedByStretch: true,
      });
    });
  });

  describe("when no size fits but one is within a size step", () => {
    it("shows the two neighbouring sizes with the closer one first", () => {
      expect(recommendFitSize(letterChart, { heightCm: 165, weightKg: 67 }, NON_STRETCH)).toEqual({
        outcome: FIT_OUTCOME.BETWEEN_SIZES,
        primary: { sizeId: "size-M", label: "M" },
        alternative: { sizeId: "size-L", label: "L" },
        isDecidedByStretch: false,
      });
    });

    it.each([
      ["the smaller size for a stretchable piece", STRETCHABLE, "M", "L"],
      ["the larger size for a non-stretch piece", NON_STRETCH, "L", "M"],
    ])(
      "lets stretch pick %s on a near tie",
      (_description, isStretchable, primary, alternative) => {
        expect(
          recommendFitSize(letterChart, { heightCm: 172, weightKg: 64 }, isStretchable),
        ).toMatchObject({
          outcome: FIT_OUTCOME.BETWEEN_SIZES,
          primary: { label: primary },
          alternative: { label: alternative },
          isDecidedByStretch: true,
        });
      },
    );

    it("skips sizes without a range when finding neighbours", () => {
      const chartWithGap = [letterChart[1], buildSize("M/L", null), letterChart[2]].filter(
        (size): size is FitSizeCandidate => size !== undefined,
      );
      expect(
        recommendFitSize(chartWithGap, { heightCm: 165, weightKg: 67 }, NON_STRETCH),
      ).toMatchObject({
        outcome: FIT_OUTCOME.BETWEEN_SIZES,
        primary: { label: "M" },
        alternative: { label: "L" },
      });
    });
  });

  describe("when no size is cut for the shopper", () => {
    it("names the nearest size and how far above its range the shopper is", () => {
      expect(recommendFitSize(letterChart, { heightCm: 200, weightKg: 100 }, NON_STRETCH)).toEqual({
        outcome: FIT_OUTCOME.NO_FIT,
        nearest: { sizeId: "size-XL", label: "XL" },
        heightOffsetCm: 10,
        weightOffsetKg: 15,
      });
    });

    it("reports negative offsets for a shopper below the smallest size", () => {
      expect(
        recommendFitSize(letterChart, { heightCm: 140, weightKg: 40 }, NON_STRETCH),
      ).toMatchObject({
        outcome: FIT_OUTCOME.NO_FIT,
        nearest: { label: "S" },
        heightOffsetCm: -10,
        weightOffsetKg: -5,
      });
    });

    it("reports NO_FIT for a near miss on a single-size product", () => {
      const singleSize = [letterChart[1]].filter(
        (size): size is FitSizeCandidate => size !== undefined,
      );
      expect(
        recommendFitSize(singleSize, { heightCm: 171, weightKg: 60 }, NON_STRETCH),
      ).toMatchObject({
        outcome: FIT_OUTCOME.NO_FIT,
        nearest: { label: "M" },
        heightOffsetCm: 1,
        weightOffsetKg: 0,
      });
    });
  });
});

describe("isMeasurementWithinBounds", () => {
  it("accepts the inclusive bounds", () => {
    expect(
      isMeasurementWithinBounds({ heightCm: FIT_HEIGHT_CM_MIN, weightKg: FIT_WEIGHT_KG_MIN }),
    ).toBe(true);
    expect(
      isMeasurementWithinBounds({ heightCm: FIT_HEIGHT_CM_MAX, weightKg: FIT_WEIGHT_KG_MAX }),
    ).toBe(true);
  });

  it.each([
    { heightCm: FIT_HEIGHT_CM_MIN - 1, weightKg: 60 },
    { heightCm: FIT_HEIGHT_CM_MAX + 1, weightKg: 60 },
    { heightCm: 165, weightKg: FIT_WEIGHT_KG_MIN - 1 },
    { heightCm: 165, weightKg: FIT_WEIGHT_KG_MAX + 1 },
    { heightCm: Number.NaN, weightKg: 60 },
    { heightCm: 165, weightKg: Number.POSITIVE_INFINITY },
  ])("rejects %o", (measurements) => {
    expect(isMeasurementWithinBounds(measurements)).toBe(false);
  });
});

describe("isFitRangeOrdered", () => {
  it("accepts ranges whose minimums do not exceed their maximums", () => {
    expect(
      isFitRangeOrdered({ minHeightCm: 160, maxHeightCm: 160, minWeightKg: 55, maxWeightKg: 65 }),
    ).toBe(true);
  });

  it("rejects an inverted weight range", () => {
    expect(
      isFitRangeOrdered({ minHeightCm: 160, maxHeightCm: 170, minWeightKg: 65, maxWeightKg: 55 }),
    ).toBe(false);
  });
});
