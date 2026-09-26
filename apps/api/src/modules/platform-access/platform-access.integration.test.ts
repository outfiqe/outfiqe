import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { UserRole } from "#generated/prisma/enums.js";
import { crmAccessService } from "#modules/crm-access/crm-access.service.js";
import { seedPlatformOrganization } from "#test/integration/crmFixtures.js";

import {
  PLATFORM_PERMISSION_CATALOG,
  PLATFORM_PERMISSION_KEYS,
} from "./platform-access.constants.js";
import { platformAccessService } from "./platform-access.service.js";

const createAdminUser = () =>
  prisma.user.create({
    data: {
      email: `platform-${randomUUID()}@outfiqe.test`,
      name: "Platform Staff",
      handle: `platform-${randomUUID().slice(0, 8)}`,
      passwordHash: "not-used-in-tests",
      role: UserRole.ADMIN,
    },
  });

const seedPlatformOrgWithPermissions = async () => {
  const seeded = await seedPlatformOrganization();
  await prisma.permission.createMany({
    data: PLATFORM_PERMISSION_CATALOG.map((permission) => ({ ...permission })),
    skipDuplicates: true,
  });
  return seeded;
};

describe("platformAccessService.permissionKeysFor", () => {
  it("returns no keys for a user with no platform-org membership", async () => {
    await seedPlatformOrgWithPermissions();
    const outsider = await createAdminUser();

    await expect(platformAccessService.permissionKeysFor(outsider.id)).resolves.toEqual([]);
  });

  it("returns the subset of platform keys the member's role holds", async () => {
    const { organization, memberRole } = await seedPlatformOrgWithPermissions();
    await prisma.rolePermission.createMany({
      data: [
        { roleId: memberRole.id, permissionKey: "platform:metrics:read" },
        { roleId: memberRole.id, permissionKey: "platform:audit:read" },
      ],
    });

    const staff = await createAdminUser();
    await prisma.membership.create({
      data: {
        organizationId: organization.id,
        userId: staff.id,
        roleId: memberRole.id,
        status: "ACTIVE",
      },
    });

    const keys = await platformAccessService.permissionKeysFor(staff.id);
    expect(keys.sort()).toEqual(["platform:audit:read", "platform:metrics:read"]);
  });

  it("grants every platform key to the platform-org SUPERADMIN regardless of role grants", async () => {
    const { organization, memberRole } = await seedPlatformOrgWithPermissions();
    const owner = await createAdminUser();
    const membership = await prisma.membership.create({
      data: {
        organizationId: organization.id,
        userId: owner.id,
        roleId: memberRole.id,
        status: "ACTIVE",
      },
    });
    await prisma.organization.update({
      where: { id: organization.id },
      data: { superAdminMembershipId: membership.id },
    });

    const keys = await platformAccessService.permissionKeysFor(owner.id);
    expect(keys.sort()).toEqual([...PLATFORM_PERMISSION_KEYS].sort());
  });

  it("grants every platform key to a co-founder on a role that holds none", async () => {
    const { organization, memberRole } = await seedPlatformOrgWithPermissions();
    const coFounder = await createAdminUser();
    await prisma.membership.create({
      data: {
        organizationId: organization.id,
        userId: coFounder.id,
        roleId: memberRole.id,
        status: "ACTIVE",
        isPlatformSuperAdmin: true,
      },
    });

    const keys = await platformAccessService.permissionKeysFor(coFounder.id);
    expect(keys.sort()).toEqual([...PLATFORM_PERMISSION_KEYS].sort());
  });

  it("lets a co-founder on a zero-permission role through the platform access gate", async () => {
    const { organization, memberRole } = await seedPlatformOrgWithPermissions();
    const coFounder = await createAdminUser();
    const plainStaff = await createAdminUser();
    await prisma.membership.createMany({
      data: [
        {
          organizationId: organization.id,
          userId: coFounder.id,
          roleId: memberRole.id,
          status: "ACTIVE",
          isPlatformSuperAdmin: true,
        },
        {
          organizationId: organization.id,
          userId: plainStaff.id,
          roleId: memberRole.id,
          status: "ACTIVE",
        },
      ],
    });

    await expect(crmAccessService.resolveHasPlatformAccess(coFounder.id)).resolves.toBe(true);
    await expect(crmAccessService.resolveHasPlatformAccess(plainStaff.id)).resolves.toBe(false);
  });

  it("returns no keys for a deactivated membership", async () => {
    const { organization, adminRole } = await seedPlatformOrgWithPermissions();
    await prisma.rolePermission.createMany({
      data: [{ roleId: adminRole.id, permissionKey: "platform:metrics:read" }],
      skipDuplicates: true,
    });

    const staff = await createAdminUser();
    await prisma.membership.create({
      data: {
        organizationId: organization.id,
        userId: staff.id,
        roleId: adminRole.id,
        status: "DEACTIVATED",
      },
    });

    await expect(platformAccessService.permissionKeysFor(staff.id)).resolves.toEqual([]);
  });
});

const addPlatformMember = async (
  organizationId: string,
  roleId: string,
  status: "ACTIVE" | "DEACTIVATED" = "ACTIVE",
) => {
  const staff = await createAdminUser();
  const membership = await prisma.membership.create({
    data: { organizationId, userId: staff.id, roleId, status },
  });
  return { staff, membership };
};

const createPlatformRole = (organizationId: string, permissionKeys: string[]) =>
  prisma.role.create({
    data: {
      organizationId,
      name: `Role ${randomUUID().slice(0, 8)}`,
      isBuiltIn: false,
      permissions: { create: permissionKeys.map((permissionKey) => ({ permissionKey })) },
    },
  });

describe("platformAccessService.resolveAccess", () => {
  it("treats a member holding any platform permission as platform staff, without full access", async () => {
    const { organization } = await seedPlatformOrgWithPermissions();
    const supportRole = await createPlatformRole(organization.id, ["platform:support:read"]);
    const { staff } = await addPlatformMember(organization.id, supportRole.id);

    await expect(platformAccessService.resolveAccess(staff.id)).resolves.toEqual({
      hasStaffAccess: true,
      hasFullAccess: false,
      permissionKeys: ["platform:support:read"],
    });
  });

  it("does not treat a member whose role holds only tenant CRM permissions as platform staff", async () => {
    const { organization, memberRole } = await seedPlatformOrgWithPermissions();
    const { staff } = await addPlatformMember(organization.id, memberRole.id);

    const access = await platformAccessService.resolveAccess(staff.id);

    expect(access.hasStaffAccess).toBe(false);
    expect(access.permissionKeys).toEqual([]);
  });

  it("gives no access to a deactivated member, whatever their role holds", async () => {
    const { organization, adminRole } = await seedPlatformOrgWithPermissions();
    const { staff } = await addPlatformMember(organization.id, adminRole.id, "DEACTIVATED");

    const access = await platformAccessService.resolveAccess(staff.id);

    expect(access.hasStaffAccess).toBe(false);
  });

  it("gives a co-founder full access and every platform permission", async () => {
    const { organization, memberRole } = await seedPlatformOrgWithPermissions();
    const { staff, membership } = await addPlatformMember(organization.id, memberRole.id);
    await prisma.membership.update({
      where: { id: membership.id },
      data: { isPlatformSuperAdmin: true },
    });

    const access = await platformAccessService.resolveAccess(staff.id);

    expect(access.hasFullAccess).toBe(true);
    expect([...access.permissionKeys].sort()).toEqual([...PLATFORM_PERMISSION_KEYS].sort());
  });
});

describe("platformAccessService.findUserIdsHoldingAnyPermission", () => {
  it("returns only active members whose role holds one of the permissions, plus co-founders", async () => {
    const { organization, memberRole } = await seedPlatformOrgWithPermissions();
    const respondRole = await createPlatformRole(organization.id, ["platform:support:respond"]);
    const financeRole = await createPlatformRole(organization.id, ["platform:finance:read"]);

    const { staff: agent } = await addPlatformMember(organization.id, respondRole.id);
    const { staff: deactivatedAgent } = await addPlatformMember(
      organization.id,
      respondRole.id,
      "DEACTIVATED",
    );
    const { staff: financeStaff } = await addPlatformMember(organization.id, financeRole.id);
    const { staff: coFounder, membership: coFounderMembership } = await addPlatformMember(
      organization.id,
      memberRole.id,
    );
    await prisma.membership.update({
      where: { id: coFounderMembership.id },
      data: { isPlatformSuperAdmin: true },
    });

    const recipientIds = await platformAccessService.findUserIdsHoldingAnyPermission([
      "platform:support:respond",
      "platform:support:manage",
    ]);

    expect(recipientIds).toContain(agent.id);
    expect(recipientIds).toContain(coFounder.id);
    expect(recipientIds).not.toContain(deactivatedAgent.id);
    expect(recipientIds).not.toContain(financeStaff.id);
  });

  it("never returns tenant staff, who have no platform membership", async () => {
    await seedPlatformOrgWithPermissions();
    const tenantOnlyAccount = await prisma.user.create({
      data: {
        email: `tenant-only-${randomUUID()}@outfiqe.test`,
        name: "Tenant Only",
        handle: `tenant-only-${randomUUID().slice(0, 8)}`,
        passwordHash: "not-used-in-tests",
        role: UserRole.TENANT_STAFF,
      },
    });

    const recipientIds = await platformAccessService.findUserIdsHoldingAnyPermission([
      "platform:brands:manage",
    ]);

    expect(recipientIds).not.toContain(tenantOnlyAccount.id);
  });
});
