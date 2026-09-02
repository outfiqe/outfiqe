import { Circle } from "lucide-react";
import { describe, expect, it } from "vitest";

import {
  isCrmSubItemVisible,
  type PlatformNavItem,
  shouldShowCrmSection,
  shouldShowPlatformSection,
  visiblePlatformNavItems,
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

const platformItems: PlatformNavItem[] = [
  { id: "orders", href: "/orders", label: "Orders", icon: Circle },
  { id: "gamification", href: "/gamification", label: "Gamification", icon: Circle },
  { id: "team", href: "/team", label: "Team", icon: Circle },
  {
    id: "platform-nav-access",
    href: "/platform/nav-access",
    label: "Navigation access",
    icon: Circle,
    coFounderOnly: true,
  },
];

describe("visiblePlatformNavItems", () => {
  it("gives a co-founder every item, including the co-founder-only one, with the marker stripped", () => {
    const result = visiblePlatformNavItems(platformItems, {
      isCoFounder: true,
      hiddenNavKeys: ["orders", "gamification"],
    });
    expect(result.map((item) => item.id)).toEqual([
      "orders",
      "gamification",
      "team",
      "platform-nav-access",
    ]);
    expect(result.every((item) => !("coFounderOnly" in item))).toBe(true);
  });

  it("drops hidden keys and the co-founder-only item for a non-co-founder", () => {
    const result = visiblePlatformNavItems(platformItems, {
      isCoFounder: false,
      hiddenNavKeys: ["gamification"],
    });
    expect(result.map((item) => item.id)).toEqual(["orders", "team"]);
  });

  it("shows every non-co-founder item when nothing is hidden", () => {
    const result = visiblePlatformNavItems(platformItems, {
      isCoFounder: false,
      hiddenNavKeys: [],
    });
    expect(result.map((item) => item.id)).toEqual(["orders", "gamification", "team"]);
  });
});
