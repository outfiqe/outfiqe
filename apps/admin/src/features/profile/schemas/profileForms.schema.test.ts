import { describe, expect, it } from "vitest";

import { changePasswordFormSchema, profileFormSchema } from "./profileForms.schema";

const messageFor = (schema: typeof changePasswordFormSchema, values: object, field: string) => {
  const result = schema.safeParse(values);
  return result.success
    ? undefined
    : result.error.issues.find((issue) => issue.path[0] === field)?.message;
};

const VALID_PASSWORDS = {
  currentPassword: "old-password",
  newPassword: "new-password-1",
  confirmNewPassword: "new-password-1",
};

describe("profileFormSchema", () => {
  it("accepts a name with or without an avatar", () => {
    expect(profileFormSchema.safeParse({ name: "Ava Martinez", avatarUrl: null }).success).toBe(
      true,
    );
  });

  it("asks for a name and rejects a one character or over-long name", () => {
    const messageForName = (name: string) => {
      const result = profileFormSchema.safeParse({ name, avatarUrl: null });
      return result.success ? undefined : result.error.issues[0]?.message;
    };

    expect(messageForName("  ")).toBe("Enter your name.");
    expect(messageForName("A")).toBe("Name must be at least 2 characters.");
    expect(messageForName("a".repeat(101))).toBe("Use at most 100 characters.");
  });
});

describe("changePasswordFormSchema", () => {
  it("accepts a matching new password of eight or more characters", () => {
    expect(changePasswordFormSchema.safeParse(VALID_PASSWORDS).success).toBe(true);
  });

  it("names each missing field", () => {
    const empty = { currentPassword: "", newPassword: "", confirmNewPassword: "" };

    expect(messageFor(changePasswordFormSchema, empty, "currentPassword")).toBe(
      "Enter your current password.",
    );
    expect(messageFor(changePasswordFormSchema, empty, "newPassword")).toBe(
      "Enter a new password.",
    );
    expect(messageFor(changePasswordFormSchema, empty, "confirmNewPassword")).toBe(
      "Confirm your new password.",
    );
  });

  it("rejects a new password shorter than eight characters", () => {
    expect(
      messageFor(
        changePasswordFormSchema,
        { ...VALID_PASSWORDS, newPassword: "short", confirmNewPassword: "short" },
        "newPassword",
      ),
    ).toBe("Password must be at least 8 characters.");
  });

  it("puts the mismatch message on the confirmation field", () => {
    expect(
      messageFor(
        changePasswordFormSchema,
        { ...VALID_PASSWORDS, confirmNewPassword: "different-1" },
        "confirmNewPassword",
      ),
    ).toBe("Passwords do not match.");
  });
});
