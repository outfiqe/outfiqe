import { describe, expect, it } from "vitest";

import { MOBILE_NUMBER_ERROR_MESSAGE, nepalPhoneField } from "./nepalPhoneField";

describe("nepalPhoneField", () => {
  it("accepts a Nepali mobile and returns it without separators", () => {
    expect(nepalPhoneField().parse(" 98 2000-0000 ".trim())).toBe("9820000000");
  });

  it("rejects a nine digit number with the mobile number message", () => {
    const result = nepalPhoneField().safeParse("+977982000000");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(MOBILE_NUMBER_ERROR_MESSAGE);
  });

  it("uses a custom message when given one", () => {
    const result = nepalPhoneField("Custom").safeParse("123");
    expect(result.error?.issues[0]?.message).toBe("Custom");
  });
});
