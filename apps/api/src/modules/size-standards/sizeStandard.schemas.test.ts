import { describe, expect, it } from "vitest";

import { createSizeStandardSchema, updateSizeStandardSchema } from "./sizeStandard.schemas.js";

describe("createSizeStandardSchema", () => {
  it("trims the name and every size", () => {
    expect(createSizeStandardSchema.parse({ name: " Letter ", labels: [" S ", "M"] })).toEqual({
      name: "Letter",
      labels: ["S", "M"],
    });
  });

  it("refuses more than 20 sizes", () => {
    const tooManyLabels = Array.from({ length: 21 }, (_unused, index) => `${index + 1}`);
    expect(
      createSizeStandardSchema.safeParse({ name: "Numeric", labels: tooManyLabels }).success,
    ).toBe(false);
  });

  it("refuses sizes that only differ by case", () => {
    expect(
      createSizeStandardSchema.safeParse({ name: "Letter", labels: ["xl", "XL"] }).success,
    ).toBe(false);
  });

  it("refuses a blank name", () => {
    expect(createSizeStandardSchema.safeParse({ name: "   ", labels: ["M"] }).success).toBe(false);
  });
});

describe("updateSizeStandardSchema", () => {
  it("accepts a rename on its own", () => {
    expect(updateSizeStandardSchema.parse({ name: "Waist" })).toEqual({ name: "Waist" });
  });

  it("accepts new sizes on their own", () => {
    expect(updateSizeStandardSchema.parse({ labels: ["28", "30"] })).toEqual({
      labels: ["28", "30"],
    });
  });

  it("refuses a body that changes nothing", () => {
    expect(updateSizeStandardSchema.safeParse({}).success).toBe(false);
  });
});
