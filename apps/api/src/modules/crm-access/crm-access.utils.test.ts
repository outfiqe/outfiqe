import { describe, expect, it } from "vitest";

import { MembershipStatus } from "#generated/prisma/enums.js";

import type {
  MembershipJoinRow,
  MembershipWithRole,
  OrganizationInviteRecord,
  OrganizationRecord,
  OwnershipTransferJoinRow,
} from "./crm-access.types.js";
import {
  buildOrganizationAdminUrl,
  canDeleteRole,
  extractSubdomain,
  findUnselectablePermissionKeys,
  toInviteSummary,
  toMembershipSummary,
  toOrganizationWithViewerContext,
  toPendingOwnershipTransferSummary,
} from "./crm-access.utils.js";

const AN_HOUR_MS = 60 * 60 * 1000;

const organization: OrganizationRecord = {
  id: "org-1",
  name: "Acme",
  subdomain: "acme",
  isPlatformOrg: false,
  plan: "pro",
  trialEndsAt: null,
  superAdminMembershipId: "mem-super",
  linkedBrandId: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-02T00:00:00Z"),
};

const superAdminMembership: MembershipWithRole = {
  id: "mem-super",
  userId: "user-1",
  organizationId: "org-1",
  roleId: "role-1",
  status: MembershipStatus.ACTIVE,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
  role: {
    id: "role-1",
    organizationId: "org-1",
    name: "Owner",
    isBuiltIn: true,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    permissionKeys: ["tickets:read", "deals:write"],
  },
};

const inviteRecord = (
  overrides: Partial<OrganizationInviteRecord>,
): OrganizationInviteRecord & { roleName: string } => ({
  id: "invite-1",
  organizationId: "org-1",
  email: "new@acme.test",
  roleId: "role-1",
  roleName: "Support",
  tokenHash: "hash",
  expiresAt: new Date(Date.now() + AN_HOUR_MS),
  acceptedAt: null,
  revokedAt: null,
  invitedById: "user-1",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  ...overrides,
});

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

describe("toOrganizationWithViewerContext", () => {
  it("marks the viewer as super admin when their membership owns the org", () => {
    const result = toOrganizationWithViewerContext(
      organization,
      superAdminMembership,
      null,
      true,
      { advancedReports: true },
      null,
    );

    expect(result.viewerIsSuperAdmin).toBe(true);
    expect(result.viewerPermissionKeys).toEqual(["tickets:read", "deals:write"]);
    expect(result.advancedFeaturesEnabled).toBe(true);
    expect(result.features).toEqual({ advancedReports: true });
    expect(result.pendingOwnershipTransfer).toBeNull();
    expect(result.activeImpersonation).toBeNull();
  });

  it("does not mark a non-owning membership as super admin and carries impersonation context", () => {
    const since = new Date("2026-02-01T00:00:00Z");
    const result = toOrganizationWithViewerContext(
      organization,
      { ...superAdminMembership, id: "mem-other" },
      null,
      false,
      {},
      { byName: "Staff Member", since },
    );

    expect(result.viewerIsSuperAdmin).toBe(false);
    expect(result.activeImpersonation).toEqual({ byName: "Staff Member", since });
  });
});

describe("toPendingOwnershipTransferSummary", () => {
  it("flattens the joined membership rows into a summary", () => {
    const request: OwnershipTransferJoinRow = {
      id: "transfer-1",
      organizationId: "org-1",
      fromMembershipId: "mem-super",
      toMembershipId: "mem-other",
      removeSenderMembershipOnAccept: true,
      expiresAt: new Date("2026-03-01T00:00:00Z"),
      acceptedAt: null,
      declinedAt: null,
      revokedAt: null,
      createdAt: new Date("2026-01-10T00:00:00Z"),
      toMembership: { userId: "user-2", user: { name: "Nadia" } },
      fromMembership: { user: { name: "Owen" } },
    };

    expect(toPendingOwnershipTransferSummary(request)).toEqual({
      id: "transfer-1",
      toMembershipId: "mem-other",
      toUserId: "user-2",
      toUserName: "Nadia",
      fromUserName: "Owen",
      removeSenderMembershipOnAccept: true,
      expiresAt: new Date("2026-03-01T00:00:00Z"),
    });
  });
});

describe("toMembershipSummary", () => {
  const membershipRow: MembershipJoinRow = {
    id: "mem-super",
    userId: "user-1",
    roleId: "role-1",
    status: MembershipStatus.ACTIVE,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    user: { name: "Owen", email: "owen@acme.test" },
    role: { name: "Owner" },
  };

  it("marks the row as super admin when it matches the org's super-admin membership", () => {
    expect(toMembershipSummary(membershipRow, "mem-super").isSuperAdmin).toBe(true);
  });

  it("is not super admin for a different membership or when the org has none", () => {
    expect(toMembershipSummary(membershipRow, "mem-other").isSuperAdmin).toBe(false);
    expect(toMembershipSummary(membershipRow, null).isSuperAdmin).toBe(false);
  });
});

describe("toInviteSummary", () => {
  it("reports ACCEPTED once the invite has been accepted", () => {
    expect(toInviteSummary(inviteRecord({ acceptedAt: new Date() })).status).toBe("ACCEPTED");
  });

  it("reports REVOKED when revoked and not yet accepted", () => {
    expect(toInviteSummary(inviteRecord({ revokedAt: new Date() })).status).toBe("REVOKED");
  });

  it("reports EXPIRED when the expiry has passed", () => {
    expect(
      toInviteSummary(inviteRecord({ expiresAt: new Date(Date.now() - AN_HOUR_MS) })).status,
    ).toBe("EXPIRED");
  });

  it("reports PENDING for a live, untouched invite", () => {
    const summary = toInviteSummary(inviteRecord({}));
    expect(summary.status).toBe("PENDING");
    expect(summary.roleName).toBe("Support");
  });
});
