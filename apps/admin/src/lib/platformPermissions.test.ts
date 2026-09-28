import { describe, expect, it } from "vitest";

import { canOpenPlatformOverview, holdsAnyPlatformPermission } from "./platformPermissions";

const supportAgent = {
  hasPlatformAccess: true,
  isCoFounder: false,
  platformPermissionKeys: ["platform:support:read"],
};

describe("holdsAnyPlatformPermission", () => {
  it("is true when the viewer holds one of the permissions", () => {
    expect(
      holdsAnyPlatformPermission(supportAgent, "platform:support:read", "platform:support:manage"),
    ).toBe(true);
  });

  it("is false when the viewer holds none of the permissions", () => {
    expect(holdsAnyPlatformPermission(supportAgent, "platform:coupons:manage")).toBe(false);
  });

  it("is true for a co-founder whatever permissions are asked for", () => {
    expect(
      holdsAnyPlatformPermission(
        { hasPlatformAccess: true, isCoFounder: true, platformPermissionKeys: [] },
        "platform:coupons:manage",
      ),
    ).toBe(true);
  });

  it("is false for someone without platform access, even if a key is somehow listed", () => {
    expect(
      holdsAnyPlatformPermission(
        {
          hasPlatformAccess: false,
          isCoFounder: false,
          platformPermissionKeys: ["platform:coupons:manage"],
        },
        "platform:coupons:manage",
      ),
    ).toBe(false);
  });
});

describe("canOpenPlatformOverview", () => {
  it("needs the cross-tenant metrics permission", () => {
    expect(canOpenPlatformOverview(supportAgent)).toBe(false);
    expect(
      canOpenPlatformOverview({
        ...supportAgent,
        platformPermissionKeys: ["platform:metrics:read"],
      }),
    ).toBe(true);
  });
});
