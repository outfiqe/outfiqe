import { describe, expect, it } from "vitest";

import { EMPTY_ZONE_FORM, zoneFormSchema } from "./zoneForm.schema";

const VALID = {
  ...EMPTY_ZONE_FORM,
  name: "Kathmandu Valley",
  standardDeliveryFee: "100",
  freeDeliveryThreshold: "3000",
  codHandlingFee: "50",
};

const messageFor = (overrides: Partial<typeof VALID>, field: keyof typeof VALID) => {
  const result = zoneFormSchema.safeParse({ ...VALID, ...overrides });
  return result.success
    ? undefined
    : result.error.issues.find((issue) => issue.path[0] === field)?.message;
};

describe("zoneFormSchema", () => {
  it("accepts a complete zone, with or without cities", () => {
    expect(zoneFormSchema.safeParse(VALID).success).toBe(true);
    expect(zoneFormSchema.safeParse({ ...VALID, cities: ["Lalitpur"] }).success).toBe(true);
  });

  it("names each missing field", () => {
    const result = zoneFormSchema.safeParse(EMPTY_ZONE_FORM);
    const messages = result.success ? [] : result.error.issues.map((issue) => issue.message);

    expect(messages).toEqual([
      "Enter a name for the zone.",
      "Enter a standard delivery fee.",
      "Enter a free delivery threshold.",
      "Enter a COD handling fee.",
    ]);
  });

  it("rejects decimals and negative fees", () => {
    expect(messageFor({ standardDeliveryFee: "99.5" }, "standardDeliveryFee")).toBe(
      "Use a whole number with no decimals or minus sign.",
    );
    expect(messageFor({ codHandlingFee: "-5" }, "codHandlingFee")).toBe(
      "Use a whole number with no decimals or minus sign.",
    );
  });

  it("limits the zone name to 120 characters", () => {
    expect(messageFor({ name: "a".repeat(121) }, "name")).toBe("Use at most 120 characters.");
  });
});
