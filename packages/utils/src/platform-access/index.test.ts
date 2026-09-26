import { describe, expect, it } from "vitest";

import { PLATFORM_NAV_KEYS } from "../platform-nav";
import {
  canAccessPlatformSection,
  findInaccessiblePlatformSections,
  PLATFORM_SECTION_ACCESS,
  PLATFORM_SECTION_KEYS,
} from "./index";

const supportOnlyViewer = {
  isCoFounder: false,
  permissionKeys: ["platform:support:read", "platform:support:respond", "platform:support:manage"],
};

describe("PLATFORM_SECTION_ACCESS", () => {
  it("declares access for every platform nav section and nothing else", () => {
    expect([...PLATFORM_SECTION_KEYS].sort()).toEqual([...PLATFORM_NAV_KEYS].sort());
  });

  it("gives every section either a permission or a co-founder requirement", () => {
    for (const sectionKey of PLATFORM_SECTION_KEYS) {
      const { permissionKeys, requiresCoFounder } = PLATFORM_SECTION_ACCESS[sectionKey];
      expect(permissionKeys.length > 0 || requiresCoFounder).toBe(true);
    }
  });
});

describe("canAccessPlatformSection", () => {
  it("lets a support-only role reach support and nothing else", () => {
    const reachable = PLATFORM_SECTION_KEYS.filter((sectionKey) =>
      canAccessPlatformSection(sectionKey, supportOnlyViewer),
    );

    expect(reachable).toEqual(["support"]);
  });

  it("lets a viewer reach a section through either its read or its manage permission", () => {
    expect(
      canAccessPlatformSection("coupons", {
        isCoFounder: false,
        permissionKeys: ["platform:coupons:read"],
      }),
    ).toBe(true);
    expect(
      canAccessPlatformSection("coupons", {
        isCoFounder: false,
        permissionKeys: ["platform:coupons:manage"],
      }),
    ).toBe(true);
  });

  it("does not let a manage-only permission on one section open a different section", () => {
    expect(
      canAccessPlatformSection("withdraw-requests", {
        isCoFounder: false,
        permissionKeys: ["platform:coupons:manage"],
      }),
    ).toBe(false);
  });

  it("keeps the navigation access page for co-founders only", () => {
    const allPermissions = {
      isCoFounder: false,
      permissionKeys: Object.values(PLATFORM_SECTION_ACCESS).flatMap(
        (access) => access.permissionKeys,
      ),
    };

    expect(canAccessPlatformSection("platform-nav-access", allPermissions)).toBe(false);
    expect(
      canAccessPlatformSection("platform-nav-access", { isCoFounder: true, permissionKeys: [] }),
    ).toBe(true);
  });

  it("lets a co-founder reach every section regardless of the permissions their role holds", () => {
    const coFounder = { isCoFounder: true, permissionKeys: [] };

    expect(findInaccessiblePlatformSections(coFounder)).toEqual([]);
  });
});

describe("findInaccessiblePlatformSections", () => {
  it("lists every section a support-only role cannot reach", () => {
    const inaccessible = findInaccessiblePlatformSections(supportOnlyViewer);

    expect(inaccessible).toContain("products");
    expect(inaccessible).toContain("withdraw-requests");
    expect(inaccessible).not.toContain("support");
    expect(inaccessible).toHaveLength(PLATFORM_SECTION_KEYS.length - 1);
  });

  it("lists every section for someone with no platform permissions at all", () => {
    expect(
      findInaccessiblePlatformSections({ isCoFounder: false, permissionKeys: [] }),
    ).toHaveLength(PLATFORM_SECTION_KEYS.length);
  });
});
