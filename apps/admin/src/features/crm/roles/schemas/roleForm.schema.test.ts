import { describe, expect, it } from "vitest";

import { organizationNameFormSchema, roleFormSchema } from "./roleForm.schema";

const roleMessage = (values: { name: string; permissionKeys: string[] }, field: string) => {
  const result = roleFormSchema.safeParse(values);
  return result.success
    ? undefined
    : result.error.issues.find((issue) => issue.path[0] === field)?.message;
};

describe("roleFormSchema", () => {
  it("accepts a named role with at least one permission", () => {
    expect(
      roleFormSchema.safeParse({ name: "Support", permissionKeys: ["tickets:read"] }).success,
    ).toBe(true);
  });

  it("asks for a name and at least one permission", () => {
    expect(roleMessage({ name: " ", permissionKeys: [] }, "name")).toBe(
      "Enter a name for the role.",
    );
    expect(roleMessage({ name: "Support", permissionKeys: [] }, "permissionKeys")).toBe(
      "Choose at least one permission for this role.",
    );
  });

  it("rejects a one character name and a name over 50 characters", () => {
    expect(roleMessage({ name: "A", permissionKeys: ["x"] }, "name")).toBe(
      "Use at least 2 characters.",
    );
    expect(roleMessage({ name: "a".repeat(51), permissionKeys: ["x"] }, "name")).toBe(
      "Use at most 50 characters.",
    );
  });
});

describe("organizationNameFormSchema", () => {
  it("accepts a name between 2 and 100 characters", () => {
    expect(organizationNameFormSchema.safeParse({ name: "Acme" }).success).toBe(true);
  });

  it("asks for a name and enforces the length limits", () => {
    const messageFor = (name: string) => {
      const result = organizationNameFormSchema.safeParse({ name });
      return result.success ? undefined : result.error.issues[0]?.message;
    };

    expect(messageFor("  ")).toBe("Enter a name for the organization.");
    expect(messageFor("A")).toBe("Use at least 2 characters.");
    expect(messageFor("a".repeat(101))).toBe("Use at most 100 characters.");
  });
});
