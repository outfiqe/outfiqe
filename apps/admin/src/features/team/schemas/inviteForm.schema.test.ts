import { describe, expect, it } from "vitest";

import { inviteFormSchema } from "./inviteForm.schema";

const VALID = { name: "Tara Tenant", email: "tara@outfiqe.test", roleId: "role-1" };

const messageFor = (overrides: Partial<typeof VALID>, field: keyof typeof VALID) => {
  const result = inviteFormSchema.safeParse({ ...VALID, ...overrides });
  return result.success
    ? undefined
    : result.error.issues.find((issue) => issue.path[0] === field)?.message;
};

describe("inviteFormSchema", () => {
  it("accepts a complete invite", () => {
    expect(inviteFormSchema.safeParse(VALID).success).toBe(true);
  });

  it("names each missing field", () => {
    expect(messageFor({ name: " " }, "name")).toBe("Enter the person's name.");
    expect(messageFor({ email: "" }, "email")).toBe("Enter an email address.");
    expect(messageFor({ roleId: "" }, "roleId")).toBe("Choose a platform role for this invite.");
  });

  it("rejects a one character name and a name over 100 characters", () => {
    expect(messageFor({ name: "T" }, "name")).toBe("Use at least 2 characters.");
    expect(messageFor({ name: "a".repeat(101) }, "name")).toBe("Use at most 100 characters.");
  });

  it("rejects an email that is not an email address", () => {
    expect(messageFor({ email: "not-an-email" }, "email")).toBe("Enter a valid email address.");
  });
});
