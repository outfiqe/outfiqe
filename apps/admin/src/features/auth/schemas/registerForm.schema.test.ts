import { describe, expect, it } from "vitest";

import {
  adminRegisterFormSchema,
  crmRegisterFormSchema,
  EMPTY_ADMIN_REGISTER_FORM,
  EMPTY_CRM_REGISTER_FORM,
} from "./registerForm.schema";

const messagesOf = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.success ? [] : (result.error?.issues.map((issue) => issue.message) ?? []);

const validAdmin = {
  phone: "9812345678",
  password: "correct-horse-1",
  confirmPassword: "correct-horse-1",
};

describe("adminRegisterFormSchema", () => {
  it("accepts a valid Nepali phone and matching passwords", () => {
    expect(adminRegisterFormSchema.safeParse(validAdmin).success).toBe(true);
  });

  it("asks for every field on an empty form", () => {
    expect(messagesOf(adminRegisterFormSchema.safeParse(EMPTY_ADMIN_REGISTER_FORM))).toEqual(
      expect.arrayContaining([
        "Enter your phone number.",
        "Enter a password.",
        "Confirm your password.",
      ]),
    );
  });

  it("rejects a phone that does not start with 98", () => {
    expect(
      messagesOf(adminRegisterFormSchema.safeParse({ ...validAdmin, phone: "123" })),
    ).toContain("Enter a valid Nepali phone number starting with 98.");
  });

  it("rejects a short password and a mismatched confirmation", () => {
    expect(
      messagesOf(
        adminRegisterFormSchema.safeParse({
          ...validAdmin,
          password: "short",
          confirmPassword: "short",
        }),
      ),
    ).toContain("Password must be at least 8 characters.");
    expect(
      messagesOf(
        adminRegisterFormSchema.safeParse({ ...validAdmin, confirmPassword: "different-1" }),
      ),
    ).toContain("Passwords do not match.");
  });
});

describe("crmRegisterFormSchema", () => {
  it("also asks for a full name of at least two characters", () => {
    expect(messagesOf(crmRegisterFormSchema.safeParse(EMPTY_CRM_REGISTER_FORM))).toContain(
      "Enter your full name.",
    );
    expect(messagesOf(crmRegisterFormSchema.safeParse({ ...validAdmin, name: "A" }))).toContain(
      "Name must be at least 2 characters.",
    );
    expect(crmRegisterFormSchema.safeParse({ ...validAdmin, name: "New Hire" }).success).toBe(true);
  });
});
