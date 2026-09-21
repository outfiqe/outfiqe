import { describe, expect, it } from "vitest";

import { crmInviteFormSchema } from "./crmInviteForm.schema";

const messageFor = (values: { email: string; roleId: string }, field: "email" | "roleId") => {
  const result = crmInviteFormSchema.safeParse(values);
  return result.success
    ? undefined
    : result.error.issues.find((issue) => issue.path[0] === field)?.message;
};

describe("crmInviteFormSchema", () => {
  it("accepts an email with a role", () => {
    expect(crmInviteFormSchema.safeParse({ email: "a@b.test", roleId: "r1" }).success).toBe(true);
  });

  it("asks for an email and a role", () => {
    expect(messageFor({ email: "", roleId: "" }, "email")).toBe("Enter an email address.");
    expect(messageFor({ email: "", roleId: "" }, "roleId")).toBe("Choose a role for this invite.");
  });

  it("rejects an email that is not an address", () => {
    expect(messageFor({ email: "nope", roleId: "r1" }, "email")).toBe(
      "Enter a valid email address.",
    );
  });
});
