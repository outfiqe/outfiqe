import { describe, expect, it } from "vitest";

import { buildEmptyMultiplierForm, multiplierFormSchema } from "./multiplierForm.schema";

const validForm = {
  ...buildEmptyMultiplierForm("2026-10-01T10:00"),
  label: "Founders Weekend",
  endsAt: "2026-10-03T10:00",
};

const firstMessageFor = (overrides: Partial<typeof validForm>, field: string) => {
  const result = multiplierFormSchema.safeParse({ ...validForm, ...overrides });
  return result.success
    ? undefined
    : result.error.issues.find((issue) => issue.path[0] === field)?.message;
};

describe("multiplierFormSchema", () => {
  it("accepts a complete form", () => {
    expect(multiplierFormSchema.safeParse(validForm).success).toBe(true);
  });

  it("asks for a label and rejects one that is too long", () => {
    expect(firstMessageFor({ label: "  " }, "label")).toBe("Enter a label for the multiplier.");
    expect(firstMessageFor({ label: "a".repeat(101) }, "label")).toBe(
      "Use at most 100 characters.",
    );
  });

  it("accepts decimals in range and rejects the rest", () => {
    expect(firstMessageFor({ multiplier: "1.5" }, "multiplier")).toBeUndefined();
    expect(firstMessageFor({ multiplier: "" }, "multiplier")).toBe("Enter a multiplier.");
    expect(firstMessageFor({ multiplier: "abc" }, "multiplier")).toBe("Use a number such as 1.5.");
    expect(firstMessageFor({ multiplier: "0.5" }, "multiplier")).toBe("Use a number from 1 to 10.");
    expect(firstMessageFor({ multiplier: "11" }, "multiplier")).toBe("Use a number from 1 to 10.");
  });

  it("asks for both dates", () => {
    expect(firstMessageFor({ startsAt: "" }, "startsAt")).toBe(
      "Choose when the multiplier starts.",
    );
    expect(firstMessageFor({ endsAt: "" }, "endsAt")).toBe("Choose when the multiplier ends.");
  });

  it("rejects an end that is not after the start", () => {
    expect(firstMessageFor({ endsAt: "2026-10-01T10:00" }, "endsAt")).toBe(
      "The multiplier must end after it starts.",
    );
  });
});
