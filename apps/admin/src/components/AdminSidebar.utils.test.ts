import { describe, expect, it } from "vitest";

import {
  isCrmSubItemVisible,
  shouldShowCrmSection,
  shouldShowPlatformSection,
} from "./AdminSidebar.utils";

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

describe("shouldShowPlatformSection", () => {
  it("hides the section from a viewer without platform access", () => {
    expect(shouldShowPlatformSection(false, { isPlatformOrg: true })).toBe(false);
  });

  it("shows the section in the platform-org context", () => {
    expect(shouldShowPlatformSection(true, { isPlatformOrg: true })).toBe(true);
  });

  it("hides the section on a tenant subdomain even with platform access", () => {
    expect(shouldShowPlatformSection(true, { isPlatformOrg: false })).toBe(false);
  });

  it("shows the section before the organization resolves so the platform nav never flashes out", () => {
    expect(shouldShowPlatformSection(true, undefined)).toBe(true);
  });
});
