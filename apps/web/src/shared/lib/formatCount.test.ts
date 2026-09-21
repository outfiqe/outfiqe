import { describe, expect, it } from "vitest";

import { formatCountLabel, formatResultCount } from "./formatCount";

describe("formatCountLabel", () => {
  it("uses the singular for exactly one", () => {
    expect(formatCountLabel(1, "piece", "pieces")).toBe("1 piece");
  });

  it("uses the plural for zero and for many", () => {
    expect(formatCountLabel(0, "piece", "pieces")).toBe("0 pieces");
    expect(formatCountLabel(12, "piece", "pieces")).toBe("12 pieces");
  });

  it("groups thousands", () => {
    expect(formatCountLabel(1200, "piece", "pieces")).toBe("1,200 pieces");
  });
});

describe("formatResultCount", () => {
  it("describes the pieces and brands of a result set", () => {
    expect(formatResultCount(12, 3)).toBe("12 pieces from 3 brands");
  });

  it("uses singular wording for one piece and one brand", () => {
    expect(formatResultCount(1, 1)).toBe("1 piece from 1 brand");
    expect(formatResultCount(5, 1)).toBe("5 pieces from 1 brand");
  });

  it("returns nothing when there are no pieces, so an empty page does not say 0 from 0", () => {
    expect(formatResultCount(0, 0)).toBe("");
  });
});
