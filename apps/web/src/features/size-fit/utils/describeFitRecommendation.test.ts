import { FIT_ALTERNATIVE_REASON, FIT_OUTCOME } from "@outfiqe/utils";
import { describe, expect, it } from "vitest";

import { describeFitRecommendation } from "./describeFitRecommendation";

const MEDIUM = { sizeId: "size-m", label: "M" };
const LARGE = { sizeId: "size-l", label: "L" };

describe("describeFitRecommendation", () => {
  it("says nothing without a chart", () => {
    expect(describeFitRecommendation({ outcome: FIT_OUTCOME.NO_CHART }, null)).toBeNull();
  });

  it("names a single fitting size", () => {
    expect(
      describeFitRecommendation(
        {
          outcome: FIT_OUTCOME.SINGLE,
          primary: MEDIUM,
          alternative: null,
          alternativeReason: null,
          isDecidedByStretch: false,
        },
        false,
      ),
    ).toEqual({
      headline: "Your size: M",
      detail: "Cut for your height and weight.",
      primarySize: MEDIUM,
      alternativeSize: null,
    });
  });

  it("suggests sizing up for room on a non-stretch piece", () => {
    expect(
      describeFitRecommendation(
        {
          outcome: FIT_OUTCOME.SINGLE,
          primary: MEDIUM,
          alternative: LARGE,
          alternativeReason: FIT_ALTERNATIVE_REASON.SIZE_UP_FOR_ROOM,
          isDecidedByStretch: false,
        },
        false,
      )?.detail,
    ).toBe("You're near the top of M and this fabric doesn't stretch, so L gives you more room.");
  });

  it("mentions a second fitting size and why stretch picked the first", () => {
    expect(
      describeFitRecommendation(
        {
          outcome: FIT_OUTCOME.SINGLE,
          primary: MEDIUM,
          alternative: LARGE,
          alternativeReason: FIT_ALTERNATIVE_REASON.ALSO_FITS,
          isDecidedByStretch: true,
        },
        true,
      )?.detail,
    ).toBe("L also fits. This fabric stretches, so M is the better pick.");
  });

  it.each([
    [true, false, "This fabric doesn't stretch, so M is the safer pick."],
    [true, null, "M is the closer fit."],
    [false, true, "M is the closer fit."],
  ])(
    "explains a between-sizes pick (decided by stretch: %s, stretchable: %s)",
    (isDecidedByStretch, isStretchable, detail) => {
      const copy = describeFitRecommendation(
        {
          outcome: FIT_OUTCOME.BETWEEN_SIZES,
          primary: MEDIUM,
          alternative: LARGE,
          isDecidedByStretch,
        },
        isStretchable,
      );
      expect(copy?.headline).toBe("You're between M and L");
      expect(copy?.detail).toBe(detail);
    },
  );

  it("uses stretch to explain a between-sizes tie", () => {
    expect(
      describeFitRecommendation(
        {
          outcome: FIT_OUTCOME.BETWEEN_SIZES,
          primary: LARGE,
          alternative: MEDIUM,
          isDecidedByStretch: true,
        },
        false,
      )?.detail,
    ).toBe("This fabric doesn't stretch, so L is the safer pick.");
  });

  it("tells the shopper how far outside the nearest size they are", () => {
    expect(
      describeFitRecommendation(
        { outcome: FIT_OUTCOME.NO_FIT, nearest: LARGE, heightOffsetCm: 6, weightOffsetKg: -3 },
        null,
      ),
    ).toEqual({
      headline: "No size here is cut for you",
      detail: "The nearest is L: you're 6 cm taller and 3 kg lighter than its range.",
      primarySize: LARGE,
      alternativeSize: null,
    });
  });

  it("leaves out a measurement that is inside the range", () => {
    expect(
      describeFitRecommendation(
        { outcome: FIT_OUTCOME.NO_FIT, nearest: MEDIUM, heightOffsetCm: -4, weightOffsetKg: 0 },
        null,
      )?.detail,
    ).toBe("The nearest is M: you're 4 cm shorter than its range.");
  });
});
