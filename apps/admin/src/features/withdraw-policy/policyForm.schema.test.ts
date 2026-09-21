import { describe, expect, it } from "vitest";

import { policyFormSchema } from "./policyForm.schema";

const VALID = {
  minAmount: "500",
  maxAmount: "50000",
  windowType: "MONTHLY" as const,
  windowValue: "5",
  maxAttemptsPerWindow: "2",
  cooldownAfterRejectionDays: "3",
  processingNoteText: "Processed within 3 working days.",
};

const messageFor = (overrides: Partial<typeof VALID>, field: keyof typeof VALID) => {
  const result = policyFormSchema.safeParse({ ...VALID, ...overrides });
  return result.success
    ? undefined
    : result.error.issues.find((issue) => issue.path[0] === field)?.message;
};

describe("policyFormSchema", () => {
  it("accepts a complete policy", () => {
    expect(policyFormSchema.safeParse(VALID).success).toBe(true);
  });

  it("accepts a zero minimum amount and a zero cooldown", () => {
    expect(messageFor({ minAmount: "0" }, "minAmount")).toBeUndefined();
    expect(
      messageFor({ cooldownAfterRejectionDays: "0" }, "cooldownAfterRejectionDays"),
    ).toBeUndefined();
  });

  it("names each missing field", () => {
    const result = policyFormSchema.safeParse({
      ...VALID,
      minAmount: "",
      maxAmount: "",
      windowValue: "",
      maxAttemptsPerWindow: "",
      cooldownAfterRejectionDays: "",
      processingNoteText: " ",
    });
    const messages = result.success ? [] : result.error.issues.map((issue) => issue.message);

    expect(messages).toEqual([
      "Enter a minimum amount.",
      "Enter a maximum amount.",
      "Enter a window value.",
      "Enter the attempts per window.",
      "Enter the cooldown in days.",
      "Enter a processing note.",
    ]);
  });

  it("requires the window value and the attempts to be at least 1", () => {
    expect(messageFor({ windowValue: "0" }, "windowValue")).toBe(
      "The window value must be at least 1.",
    );
    expect(messageFor({ maxAttemptsPerWindow: "0" }, "maxAttemptsPerWindow")).toBe(
      "Allow at least 1 attempt.",
    );
  });

  it("requires the max amount to be above the min amount", () => {
    expect(messageFor({ minAmount: "500", maxAmount: "500" }, "maxAmount")).toBe(
      "Max amount must be greater than min amount.",
    );
  });

  it("rejects decimals and limits the processing note to 300 characters", () => {
    expect(messageFor({ minAmount: "1.5" }, "minAmount")).toBe(
      "Use a whole number with no decimals or minus sign.",
    );
    expect(messageFor({ processingNoteText: "a".repeat(301) }, "processingNoteText")).toBe(
      "Use at most 300 characters.",
    );
  });
});
