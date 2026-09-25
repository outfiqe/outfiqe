import { describe, expect, it } from "vitest";

import { isStaffUserRole } from "./index";

describe("isStaffUserRole", () => {
  it("treats platform staff as staff", () => {
    expect(isStaffUserRole("ADMIN")).toBe(true);
  });

  it("treats tenant staff as staff", () => {
    expect(isStaffUserRole("TENANT_STAFF")).toBe(true);
  });

  it("does not treat shoppers or brand owners as staff", () => {
    expect(isStaffUserRole("CUSTOMER")).toBe(false);
    expect(isStaffUserRole("BRAND_OWNER")).toBe(false);
  });

  it("does not treat a missing role as staff", () => {
    expect(isStaffUserRole(undefined)).toBe(false);
    expect(isStaffUserRole(null)).toBe(false);
  });
});
