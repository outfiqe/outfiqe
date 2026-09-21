import { describe, expect, it } from "vitest";

import { EMPTY_TIER_FORM, tierFormSchema } from "./tierForm.schema";

const VALID = { minPrice: "0", maxPrice: "2000", amount: "100", sortOrder: "" };

const messageFor = (overrides: Partial<typeof VALID>, field: keyof typeof VALID) => {
  const result = tierFormSchema.safeParse({ ...VALID, ...overrides });
  return result.success
    ? undefined
    : result.error.issues.find((issue) => issue.path[0] === field)?.message;
};

describe("tierFormSchema", () => {
  it("accepts a bounded tier and an open-ended tier", () => {
    expect(tierFormSchema.safeParse(VALID).success).toBe(true);
    expect(tierFormSchema.safeParse({ ...VALID, maxPrice: "" }).success).toBe(true);
  });

  it("asks for a minimum price and a commission amount", () => {
    const result = tierFormSchema.safeParse(EMPTY_TIER_FORM);
    const messages = result.success ? [] : result.error.issues.map((issue) => issue.message);

    expect(messages).toEqual(["Enter a minimum price.", "Enter a commission amount."]);
  });

  it("requires a commission of at least Rs. 1", () => {
    expect(messageFor({ amount: "0" }, "amount")).toBe("Commission must be at least Rs. 1.");
  });

  it("requires the max price to be above the min price", () => {
    expect(messageFor({ minPrice: "500", maxPrice: "500" }, "maxPrice")).toBe(
      "Max price must be greater than min price.",
    );
    expect(messageFor({ minPrice: "500", maxPrice: "400" }, "maxPrice")).toBe(
      "Max price must be greater than min price.",
    );
  });

  it("rejects decimals and negatives", () => {
    expect(messageFor({ minPrice: "1.5" }, "minPrice")).toBe(
      "Use a whole number with no decimals or minus sign.",
    );
    expect(messageFor({ sortOrder: "-1" }, "sortOrder")).toBe(
      "Use a whole number with no decimals or minus sign.",
    );
  });
});
