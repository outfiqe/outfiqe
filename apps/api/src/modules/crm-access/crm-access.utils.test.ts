import { describe, expect, it } from "vitest";

import {
  buildOrganizationAdminUrl,
  canDeleteRole,
  extractSubdomain,
  findUnselectablePermissionKeys,
} from "./crm-access.utils.js";

describe("extractSubdomain", () => {
  it("extracts a valid subdomain ahead of the base domain", () => {
    expect(extractSubdomain("acme-corp.localhost", "localhost")).toBe("acme-corp");
    expect(extractSubdomain("acme-corp.outfiqe.com", "outfiqe.com")).toBe("acme-corp");
  });

  it("is case-insensitive on both the host and the base domain", () => {
    expect(extractSubdomain("Acme-Corp.LOCALHOST", "localhost")).toBe("acme-corp");
  });

  it("strips a port from the host before matching", () => {
    expect(extractSubdomain("acme-corp.localhost:4000", "localhost")).toBe("acme-corp");
  });

  it("returns null for the bare base domain with no subdomain", () => {
    expect(extractSubdomain("localhost", "localhost")).toBeNull();
    expect(extractSubdomain("localhost:4000", "localhost")).toBeNull();
  });

  it("returns null for a host that doesn't belong to the base domain at all", () => {
    expect(extractSubdomain("evil.example.com", "localhost")).toBeNull();
  });

  it("returns null for a reserved subdomain", () => {
    expect(extractSubdomain("www.localhost", "localhost")).toBeNull();
    expect(extractSubdomain("api.localhost", "localhost")).toBeNull();
  });

  it("returns null for a malformed subdomain label", () => {
    expect(extractSubdomain("-bad.localhost", "localhost")).toBeNull();
    expect(extractSubdomain("multi.level.localhost", "localhost")).toBeNull();
  });
});

describe("buildOrganizationAdminUrl", () => {
  it("uses the tenant's own subdomain for a non-platform organization", () => {
    expect(
      buildOrganizationAdminUrl(
        { subdomain: "daraz", isPlatformOrg: false },
        "/crm/invites/accept?token=abc123",
        "http://outfiqe.local:3000/admin",
        "outfiqe.local",
      ),
    ).toBe("http://daraz.outfiqe.local:3000/admin/crm/invites/accept?token=abc123");
  });

  it("keeps the bare admin url for the platform organization", () => {
    expect(
      buildOrganizationAdminUrl(
        { subdomain: "outfiqe", isPlatformOrg: true },
        "/crm",
        "http://outfiqe.local:3000/admin",
        "outfiqe.local",
      ),
    ).toBe("http://outfiqe.local:3000/admin/crm");
  });

  it("omits the port when the admin url doesn't have one", () => {
    expect(
      buildOrganizationAdminUrl(
        { subdomain: "daraz", isPlatformOrg: false },
        "/crm",
        "https://outfiqe.com/admin",
        "outfiqe.com",
      ),
    ).toBe("https://daraz.outfiqe.com/admin/crm");
  });
});

describe("findUnselectablePermissionKeys", () => {
  it("returns nothing when every key is a grantable catalog key", () => {
    expect(findUnselectablePermissionKeys(["tickets:read", "deals:write", "reports:read"])).toEqual(
      [],
    );
  });

  it("flags SUPERADMIN-only and platform keys", () => {
    expect(
      findUnselectablePermissionKeys(["tickets:read", "org:transfer_ownership", "platform:access"]),
    ).toEqual(["org:transfer_ownership", "platform:access"]);
  });

  it("flags keys that aren't in the catalog at all", () => {
    expect(findUnselectablePermissionKeys(["tickets:read", "made:up"])).toEqual(["made:up"]);
  });
});

describe("canDeleteRole", () => {
  it("allows deleting a custom role with no members", () => {
    expect(canDeleteRole({ isBuiltIn: false }, 0)).toBe(true);
  });

  it("blocks deleting a custom role that still has members", () => {
    expect(canDeleteRole({ isBuiltIn: false }, 1)).toBe(false);
  });

  it("blocks deleting a built-in role regardless of member count", () => {
    expect(canDeleteRole({ isBuiltIn: true }, 0)).toBe(false);
  });
});
