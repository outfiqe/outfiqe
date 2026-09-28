import { Circle } from "lucide-react";
import { describe, expect, it } from "vitest";

import {
  groupPlatformNavItems,
  isAdminNavReady,
  isCrmSubItemVisible,
  type PlatformNavItem,
  resolveAccountLabel,
  shouldRefetchCrmOrganizationOnFocus,
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
  it("shows an item with no permission key once the organization is known", () => {
    expect(isCrmSubItemVisible({ permissionKey: null }, brandlessOrg)).toBe(true);
  });

  it("hides every item when the organization could not be identified", () => {
    expect(isCrmSubItemVisible({ permissionKey: null }, undefined)).toBe(false);
    expect(isCrmSubItemVisible({ permissionKey: "customers:read" }, undefined)).toBe(false);
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

  it("hides the section when the organization could not be identified", () => {
    expect(shouldShowCrmSection(undefined)).toBe(false);
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

describe("isAdminNavReady", () => {
  it("is not ready while the session is still restoring", () => {
    expect(isAdminNavReady(false, true)).toBe(false);
  });

  it("is not ready before the crm-organization lookup has answered for the first time", () => {
    expect(isAdminNavReady(true, false)).toBe(false);
  });

  it("stays ready once the lookup has answered, even while it refetches in the background", () => {
    expect(isAdminNavReady(true, true)).toBe(true);
  });
});

describe("shouldRefetchCrmOrganizationOnFocus", () => {
  it("does not re-ask on focus after the server refused the lookup", () => {
    expect(shouldRefetchCrmOrganizationOnFocus({ state: { status: "error" } })).toBe(false);
  });

  it("keeps a successful lookup fresh on focus", () => {
    expect(shouldRefetchCrmOrganizationOnFocus({ state: { status: "success" } })).toBe(true);
  });
});

describe("resolveAccountLabel", () => {
  it("labels a platform staff account generically regardless of CRM role", () => {
    expect(resolveAccountLabel({ hasPlatformAccess: true, crmRoleName: "Member" })).toBe(
      "Admin account",
    );
  });

  it("shows a tenant user their actual CRM role", () => {
    expect(resolveAccountLabel({ hasPlatformAccess: false, crmRoleName: "Member" })).toBe("Member");
    expect(resolveAccountLabel({ hasPlatformAccess: false, crmRoleName: "Admin" })).toBe("Admin");
  });

  it("falls back to the generic label when the CRM role has not resolved yet", () => {
    expect(resolveAccountLabel({ hasPlatformAccess: false, crmRoleName: undefined })).toBe(
      "Admin account",
    );
  });
});

const platformItems: PlatformNavItem[] = [
  { id: "orders", href: "/orders", label: "Orders", icon: Circle, group: "commerce" },
  {
    id: "gamification",
    href: "/gamification",
    label: "Gamification",
    icon: Circle,
    group: "growth",
  },
  { id: "team", href: "/team", label: "Team", icon: Circle, group: "brand-tenants" },
  {
    id: "platform-nav-access",
    href: "/platform/nav-access",
    label: "Navigation access",
    icon: Circle,
    group: "platform-settings",
    coFounderOnly: true,
  },
];

const groupIcons = {
  "brand-tenants": Circle,
  catalog: Circle,
  commerce: Circle,
  moderation: Circle,
  finance: Circle,
  growth: Circle,
  "platform-settings": Circle,
} as const;

describe("groupPlatformNavItems", () => {
  it("gives a co-founder every item, including the co-founder-only one, grouped and with markers stripped", () => {
    const result = groupPlatformNavItems(
      platformItems,
      { isCoFounder: true, hiddenNavKeys: ["orders", "gamification"] },
      groupIcons,
    );

    expect(result.map((group) => group.id)).toEqual([
      "platform-group-brand-tenants",
      "platform-group-commerce",
      "platform-group-growth",
      "platform-group-platform-settings",
    ]);
    expect(result.flatMap((group) => group.items?.map((item) => item.id) ?? [])).toEqual([
      "team",
      "orders",
      "gamification",
      "platform-nav-access",
    ]);
    expect(result.every((group) => group.items?.every((item) => !("coFounderOnly" in item)))).toBe(
      true,
    );
  });

  it("drops hidden keys and the co-founder-only item's group for a non-co-founder", () => {
    const result = groupPlatformNavItems(
      platformItems,
      { isCoFounder: false, hiddenNavKeys: ["gamification"] },
      groupIcons,
    );

    expect(result.map((group) => group.id)).toEqual([
      "platform-group-brand-tenants",
      "platform-group-commerce",
    ]);
  });

  it("shows every non-co-founder-visible group when nothing is hidden", () => {
    const result = groupPlatformNavItems(
      platformItems,
      { isCoFounder: false, hiddenNavKeys: [] },
      groupIcons,
    );

    expect(result.map((group) => group.id)).toEqual([
      "platform-group-brand-tenants",
      "platform-group-commerce",
      "platform-group-growth",
    ]);
  });

  it("omits a group entirely once all of its items are filtered out", () => {
    const result = groupPlatformNavItems(
      platformItems,
      { isCoFounder: false, hiddenNavKeys: ["orders", "gamification", "team"] },
      groupIcons,
    );

    expect(result).toEqual([]);
  });
});
