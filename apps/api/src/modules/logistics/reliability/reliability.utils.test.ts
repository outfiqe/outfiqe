import { describe, expect, it } from "vitest";

import {
  BRAND_RELIABILITY_LEVEL,
  RELIABILITY_REVIEW_INCIDENTS,
  RELIABILITY_WARNING_INCIDENTS,
} from "./reliability.constants.js";
import { describeReliabilityLevel } from "./reliability.utils.js";

describe("describeReliabilityLevel", () => {
  it("warns at three incidents in the window and asks for a review at six", () => {
    expect(describeReliabilityLevel(0)).toBe(BRAND_RELIABILITY_LEVEL.GOOD);
    expect(describeReliabilityLevel(RELIABILITY_WARNING_INCIDENTS - 1)).toBe(
      BRAND_RELIABILITY_LEVEL.GOOD,
    );
    expect(describeReliabilityLevel(RELIABILITY_WARNING_INCIDENTS)).toBe(
      BRAND_RELIABILITY_LEVEL.WARNING,
    );
    expect(describeReliabilityLevel(RELIABILITY_REVIEW_INCIDENTS)).toBe(
      BRAND_RELIABILITY_LEVEL.REVIEW,
    );
  });
});
