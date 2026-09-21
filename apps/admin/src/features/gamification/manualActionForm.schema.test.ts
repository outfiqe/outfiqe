import { describe, expect, it } from "vitest";

import {
  adjustXpFormSchema,
  awardBadgeFormSchema,
  EMPTY_ADJUST_XP_FORM,
  EMPTY_AWARD_BADGE_FORM,
} from "./manualActionForm.schema";

const someUser = { id: "user-1", name: "Asha", handle: "asha" };

const adjustMessageFor = (overrides: Partial<typeof EMPTY_ADJUST_XP_FORM>, field: string) => {
  const result = adjustXpFormSchema.safeParse({
    target: someUser,
    amount: "50",
    reason: "Contest prize",
    ...overrides,
  });
  return result.success
    ? undefined
    : [...result.error.issues].reverse().find((issue) => issue.path[0] === field)?.message;
};

describe("awardBadgeFormSchema", () => {
  it("asks for a badge, a user and a reason on an empty form", () => {
    const result = awardBadgeFormSchema.safeParse(EMPTY_AWARD_BADGE_FORM);
    const messages = result.success ? [] : result.error.issues.map((issue) => issue.message);
    expect(messages).toEqual(
      expect.arrayContaining([
        "Choose a badge.",
        "Choose a user.",
        "Enter a reason for the audit trail.",
      ]),
    );
  });

  it("accepts a complete form", () => {
    expect(
      awardBadgeFormSchema.safeParse({ badgeId: "b-1", recipient: someUser, reason: "Won" })
        .success,
    ).toBe(true);
  });

  it("rejects a reason over 500 characters", () => {
    const result = awardBadgeFormSchema.safeParse({
      badgeId: "b-1",
      recipient: someUser,
      reason: "a".repeat(501),
    });
    expect(result.success).toBe(false);
  });
});

describe("adjustXpFormSchema", () => {
  it("accepts positive and negative whole amounts", () => {
    expect(adjustMessageFor({ amount: "50" }, "amount")).toBeUndefined();
    expect(adjustMessageFor({ amount: "-25" }, "amount")).toBeUndefined();
  });

  it("asks for an amount and a user on an empty form", () => {
    expect(adjustXpFormSchema.safeParse(EMPTY_ADJUST_XP_FORM).success).toBe(false);
    expect(adjustMessageFor({ amount: "" }, "amount")).toBe("Enter an amount.");
    expect(adjustMessageFor({ target: null }, "target")).toBe("Choose a user.");
  });

  it("rejects zero, decimals and huge amounts", () => {
    expect(adjustMessageFor({ amount: "0" }, "amount")).toBe("The amount must not be zero.");
    expect(adjustMessageFor({ amount: "1.5" }, "amount")).toBe(
      "Use a whole number, with a minus sign to dock XP.",
    );
    expect(adjustMessageFor({ amount: "2000000000" }, "amount")).toBe(
      "Use an amount up to 1,000,000,000.",
    );
  });
});
