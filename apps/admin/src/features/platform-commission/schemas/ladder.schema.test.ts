import { describe, expect, it } from "vitest";

import { type TierRowState, validateLadder } from "./ladder.schema";

const row = (overrides: Partial<TierRowState> = {}): TierRowState => ({
  key: "r1",
  minPrice: "0",
  maxPrice: "",
  feeType: "PERCENT",
  flatAmount: "",
  ratePercent: "5",
  ...overrides,
});

describe("validateLadder", () => {
  it("accepts a single open-ended percent band starting at zero", () => {
    expect(validateLadder([row()])).toEqual({ rowErrorsByKey: {}, ladderError: null });
  });

  it("accepts contiguous bands with an open top band", () => {
    const rows = [
      row({ key: "a", minPrice: "0", maxPrice: "1000", ratePercent: "8" }),
      row({ key: "b", minPrice: "1000", maxPrice: "", feeType: "FLAT", flatAmount: "120" }),
    ];

    expect(validateLadder(rows).ladderError).toBeNull();
  });

  it("names the missing field on the row that has it", () => {
    const { rowErrorsByKey } = validateLadder([row({ ratePercent: "" })]);

    expect(rowErrorsByKey.r1?.ratePercent).toBe("Enter a commission rate.");
  });

  it("checks the field that matches the band's fee type", () => {
    const { rowErrorsByKey } = validateLadder([row({ feeType: "FLAT", flatAmount: "" })]);

    expect(rowErrorsByKey.r1?.flatAmount).toBe("Enter a commission amount.");
    expect(rowErrorsByKey.r1?.ratePercent).toBeUndefined();
  });

  it("rejects decimals in prices and a percent above 100", () => {
    const { rowErrorsByKey } = validateLadder([row({ minPrice: "1.5", ratePercent: "101" })]);

    expect(rowErrorsByKey.r1?.minPrice).toBe("Use a whole number with no decimals or minus sign.");
    expect(rowErrorsByKey.r1?.ratePercent).toBe("Use a number up to 100.");
  });

  it("explains a ladder that does not start at zero, has a gap, or is not open-ended", () => {
    expect(validateLadder([row({ minPrice: "10" })]).ladderError).toBe(
      "The lowest band must start at Rs. 0.",
    );
    expect(validateLadder([row({ maxPrice: "500" })]).ladderError).toBe(
      "The highest band must be open-ended — leave its max price blank.",
    );
    expect(
      validateLadder([
        row({ key: "a", minPrice: "0", maxPrice: "500" }),
        row({ key: "b", minPrice: "600", maxPrice: "" }),
      ]).ladderError,
    ).toBe("Bands must be contiguous, with no gaps or overlaps between them.");
  });

  it("reports row problems before ladder-shape problems", () => {
    const result = validateLadder([row({ minPrice: "10", ratePercent: "" })]);

    expect(result.ladderError).toBeNull();
    expect(result.rowErrorsByKey.r1?.ratePercent).toBe("Enter a commission rate.");
  });
});
