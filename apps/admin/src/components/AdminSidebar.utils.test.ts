import { describe, expect, it } from "vitest";

import { isCrmSubItemVisible, shouldShowCrmSection } from "./AdminSidebar.utils";

const brandlessOrg = {
  viewerIsSuperAdmin: true,
  viewerPermissionKeys: [],
  linkedBrandId: null,
};

const brandLinkedOrg = {
  viewerIsSuperAdmin: false,
  viewerPermissionKeys: ["customers:read"],
  linkedBrandId: "brand-1",
};

describe("isCrmSubItemVisible", () => {
  it("always shows an item with no permission key", () => {
    expect(isCrmSubItemVisible({ permissionKey: null }, undefined)).toBe(true);
    expect(isCrmSubItemVisible({ permissionKey: null }, brandlessOrg)).toBe(true);
  });

  it("hides a brand-scoped item when the resolved org has no linked brand", () => {
    expect(
      isCrmSubItemVisible(
        { permissionKey: "customers:read", requiresLinkedBrand: true },
        brandlessOrg,
      ),
    ).toBe(false);
  });

  it("shows a brand-scoped item once the org is linked to a brand", () => {
    expect(
      isCrmSubItemVisible(
        { permissionKey: "customers:read", requiresLinkedBrand: true },
        brandLinkedOrg,
      ),
    ).toBe(true);
  });

  it("does not hide a brand-scoped item before the org has loaded", () => {
    expect(
      isCrmSubItemVisible(
        { permissionKey: "customers:read", requiresLinkedBrand: true },
        undefined,
      ),
    ).toBe(true);
  });

  it("shows a permission-gated item to the org superadmin", () => {
    expect(isCrmSubItemVisible({ permissionKey: "roles:read" }, brandlessOrg)).toBe(true);
  });

  it("shows a permission-gated item to a viewer holding the key", () => {
    expect(isCrmSubItemVisible({ permissionKey: "customers:read" }, brandLinkedOrg)).toBe(true);
  });

  it("hides a permission-gated item from a viewer without the key", () => {
    expect(isCrmSubItemVisible({ permissionKey: "audit:read" }, brandLinkedOrg)).toBe(false);
  });
});

describe("shouldShowCrmSection", () => {
  it("shows the section for a tenant organization", () => {
    expect(shouldShowCrmSection({ isPlatformOrg: false })).toBe(true);
  });

  it("hides the section for the platform organization", () => {
    expect(shouldShowCrmSection({ isPlatformOrg: true })).toBe(false);
  });

  it("shows the section while the organization is still loading", () => {
    expect(shouldShowCrmSection(undefined)).toBe(true);
  });
});
