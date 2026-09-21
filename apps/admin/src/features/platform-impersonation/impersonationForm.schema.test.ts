import { describe, expect, it } from "vitest";

import { EMPTY_IMPERSONATION_FORM, impersonationFormSchema } from "./impersonationForm.schema";

const validForm = {
  organizationId: "org-1",
  targetUserId: "user-9",
  reason: "confirming a refund was applied",
  scope: "read" as const,
  ttlMinutes: "",
};

const messagesFor = (overrides: Partial<typeof validForm>) => {
  const result = impersonationFormSchema.safeParse({ ...validForm, ...overrides });
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe("impersonationFormSchema", () => {
  it("accepts a complete form with no time limit", () => {
    expect(messagesFor({})).toEqual([]);
  });

  it("asks for a tenant, a member and a reason on an empty form", () => {
    const result = impersonationFormSchema.safeParse(EMPTY_IMPERSONATION_FORM);
    const messages = result.success ? [] : result.error.issues.map((issue) => issue.message);
    expect(messages).toEqual(
      expect.arrayContaining([
        "Pick a tenant.",
        "Pick a member to act as.",
        "Enter a reason for the audit trail.",
      ]),
    );
  });

  it("rejects a reason that is too short", () => {
    expect(messagesFor({ reason: "ab" })).toContain("Use at least 3 characters.");
  });

  it("keeps the optional minutes between 1 and 60", () => {
    expect(messagesFor({ ttlMinutes: "30" })).toEqual([]);
    expect(messagesFor({ ttlMinutes: "0" })).toContain("Use a number from 1 to 60 minutes.");
    expect(messagesFor({ ttlMinutes: "61" })).toContain("Use a number from 1 to 60 minutes.");
    expect(messagesFor({ ttlMinutes: "1.5" })).toContain(
      "Use a whole number with no decimals or minus sign.",
    );
  });
});
