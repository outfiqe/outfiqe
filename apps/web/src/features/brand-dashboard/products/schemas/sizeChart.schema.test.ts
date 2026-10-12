import { describe, expect, it } from "vitest";

import {
  EMPTY_FIT_RANGE_DRAFT,
  findFitRangeDraftProblem,
  fitRangeDraftSchema,
  toFitRange,
  toFitRangeDraft,
} from "./sizeChart.schema";

const MEDIUM_DRAFT = {
  minHeightCm: "160",
  maxHeightCm: "170",
  minWeightKg: "55",
  maxWeightKg: "65",
};
const MEDIUM_RANGE = { minHeightCm: 160, maxHeightCm: 170, minWeightKg: 55, maxWeightKg: 65 };

describe("findFitRangeDraftProblem", () => {
  it("accepts an empty row and a complete, ordered row", () => {
    expect(findFitRangeDraftProblem(EMPTY_FIT_RANGE_DRAFT)).toBeNull();
    expect(findFitRangeDraftProblem(MEDIUM_DRAFT)).toBeNull();
  });

  it.each([
    [{ ...MEDIUM_DRAFT, maxWeightKg: "" }, "Fill in all four numbers, or leave them all empty."],
    [{ ...MEDIUM_DRAFT, minHeightCm: "40" }, "Heights must be whole numbers from 50 to 230 cm."],
    [{ ...MEDIUM_DRAFT, minHeightCm: "160.5" }, "Heights must be whole numbers from 50 to 230 cm."],
    [{ ...MEDIUM_DRAFT, maxWeightKg: "250" }, "Weights must be whole numbers from 10 to 200 kg."],
    [{ ...MEDIUM_DRAFT, minHeightCm: "175" }, "The shortest height can't be above the tallest."],
    [{ ...MEDIUM_DRAFT, minWeightKg: "70" }, "The lightest weight can't be above the heaviest."],
  ])("explains what is wrong with %o", (draft, message) => {
    expect(findFitRangeDraftProblem(draft)).toBe(message);
  });
});

describe("fitRangeDraftSchema", () => {
  it("reports the row's problem as its validation message", () => {
    const result = fitRangeDraftSchema.safeParse({ ...MEDIUM_DRAFT, minHeightCm: "" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      "Fill in all four numbers, or leave them all empty.",
    );
  });
});

describe("toFitRange and toFitRangeDraft", () => {
  it("round-trips a range through its draft", () => {
    expect(toFitRange(toFitRangeDraft(MEDIUM_RANGE))).toEqual(MEDIUM_RANGE);
  });

  it("turns an empty or invalid draft into no range", () => {
    expect(toFitRange(EMPTY_FIT_RANGE_DRAFT)).toBeNull();
    expect(toFitRange({ ...MEDIUM_DRAFT, minHeightCm: "175" })).toBeNull();
    expect(toFitRangeDraft(null)).toEqual(EMPTY_FIT_RANGE_DRAFT);
  });
});
