import { describe, expect, it } from "vitest";

import { EMPTY_EXEMPTION_FORM, exemptionFormSchema } from "./exemptionForm.schema";

const VALID = {
  brandId: "b1",
  startsAt: "2026-10-01",
  endsAt: "2026-11-01",
  reason: "Launch cohort",
};

const messageFor = (overrides: Partial<typeof VALID>, field: keyof typeof VALID) => {
  const result = exemptionFormSchema.safeParse({ ...VALID, ...overrides });
  return result.success
    ? undefined
    : result.error.issues.find((issue) => issue.path[0] === field)?.message;
};

describe("exemptionFormSchema", () => {
  it("accepts a complete exemption", () => {
    expect(exemptionFormSchema.safeParse(VALID).success).toBe(true);
  });

  it("names each missing field", () => {
    const result = exemptionFormSchema.safeParse(EMPTY_EXEMPTION_FORM);
    const messages = result.success ? [] : result.error.issues.map((issue) => issue.message);

    expect(messages).toEqual([
      "Pick the brand this exemption is for.",
      "Choose a start date.",
      "Choose an end date.",
      "Explain why this brand is exempt.",
    ]);
  });

  it("requires the end date to be after the start date", () => {
    expect(messageFor({ endsAt: "2026-10-01" }, "endsAt")).toBe(
      "The end date must be after the start date.",
    );
    expect(messageFor({ endsAt: "2026-09-01" }, "endsAt")).toBe(
      "The end date must be after the start date.",
    );
  });

  it("limits the reason to 300 characters", () => {
    expect(messageFor({ reason: "a".repeat(301) }, "reason")).toBe("Use at most 300 characters.");
  });
});
