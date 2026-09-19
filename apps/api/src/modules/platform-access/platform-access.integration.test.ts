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
    await prisma.rolePermission.create({
      data: { roleId: adminRole.id, permissionKey: "platform:metrics:read" },
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
