import { describe, expect, it } from "vitest";

import { platformRoleFormSchema } from "./platformRoleForm.schema";

const messagesFor = (values: { name: string; permissionKeys: string[] }) => {
  const result = platformRoleFormSchema.safeParse(values);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe("platformRoleFormSchema", () => {
  it("accepts a named role with at least one permission", () => {
    expect(
      messagesFor({ name: "Support only", permissionKeys: ["platform:support:read"] }),
    ).toEqual([]);
  });

  it("asks for a name and a permission on an empty form", () => {
    expect(messagesFor({ name: "", permissionKeys: [] })).toEqual(
      expect.arrayContaining(["Enter a name for the role.", "Choose at least one permission."]),
    );
  });

  it("rejects a name that is too short or too long", () => {
    expect(messagesFor({ name: "A", permissionKeys: ["k"] })).toContain(
      "Use at least 2 characters.",
    );
    expect(messagesFor({ name: "A".repeat(51), permissionKeys: ["k"] })).toContain(
      "Use at most 50 characters.",
    );
  });
});
