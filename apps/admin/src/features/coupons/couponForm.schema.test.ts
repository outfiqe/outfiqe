import { describe, expect, it } from "vitest";

import { couponFormSchema, EMPTY_COUPON_FORM } from "./couponForm.schema";

const messagesFor = (overrides: Partial<typeof EMPTY_COUPON_FORM>) => {
  const result = couponFormSchema.safeParse({
    ...EMPTY_COUPON_FORM,
    code: "WELCOME",
    ...overrides,
  });
  return result.success
    ? {}
    : Object.fromEntries(
        [...result.error.issues].reverse().map((issue) => [issue.path.join("."), issue.message]),
      );
};

describe("couponFormSchema", () => {
  it("accepts the defaults with a valid code", () => {
    expect(messagesFor({})).toEqual({});
  });

  it("asks for a code when it is blank", () => {
    expect(messagesFor({ code: "  " }).code).toBe("Enter a coupon code.");
  });

  it("rejects a code that is too short or too long", () => {
    expect(messagesFor({ code: "abc" }).code).toBe("Use at least 4 characters.");
    expect(messagesFor({ code: "A".repeat(25) }).code).toBe("Use at most 24 characters.");
  });

  it("checks the percentage only for a percent coupon", () => {
    expect(messagesFor({ percentOff: "" }).percentOff).toBe("Enter a percentage.");
    expect(messagesFor({ percentOff: "101" }).percentOff).toBe("Use a number up to 100.");
    expect(messagesFor({ percentOff: "0" }).percentOff).toBe("Use a number that is at least 1.");
    expect(messagesFor({ type: "FIXED", percentOff: "" })).toEqual({});
  });

  it("checks the fixed amount only for a fixed coupon", () => {
    expect(messagesFor({ type: "FIXED", fixedAmount: "" }).fixedAmount).toBe("Enter an amount.");
    expect(messagesFor({ type: "FIXED", fixedAmount: "0" }).fixedAmount).toBe(
      "Use a number that is at least 1.",
    );
    expect(messagesFor({ fixedAmount: "" })).toEqual({});
  });

  it("rejects decimals and zero in the optional limits but allows blank", () => {
    expect(messagesFor({ totalBudgetAmount: "1.5" }).totalBudgetAmount).toBe(
      "Use a whole number with no decimals or minus sign.",
    );
    expect(messagesFor({ maxRedemptions: "0" }).maxRedemptions).toBe(
      "Use a number that is at least 1.",
    );
    expect(messagesFor({ maxDiscountAmount: "" })).toEqual({});
  });

  it("asks for a minimum subtotal but allows zero", () => {
    expect(messagesFor({ minSubtotal: "" }).minSubtotal).toBe("Enter a minimum subtotal.");
    expect(messagesFor({ minSubtotal: "0" })).toEqual({});
  });
});
