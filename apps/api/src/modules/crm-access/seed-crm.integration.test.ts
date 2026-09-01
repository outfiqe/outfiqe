import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { UserRole } from "#generated/prisma/enums.js";
import { crmAccessService } from "#modules/crm-access/crm-access.service.js";

import { seedPlatformCrm } from "../../../prisma/seed-crm.js";
import { BUILT_IN_ROLE_NAME, PLATFORM_ACCESS_PERMISSION_KEY } from "./crm-access.constants.js";

const PLATFORM_ORGANIZATION_SUBDOMAIN = "outfiqe";
const BUILT_IN_ROLE_COUNT = 2;

const createAdminUser = (label: string) =>
  prisma.user.create({
    data: {
      email: `${label}-${randomUUID()}@outfiqe.test`,
      name: label,
      handle: `${label}-${randomUUID().slice(0, 8)}`,
      passwordHash: "not-used-in-tests",
      role: UserRole.ADMIN,
    },
  });

const findPlatformOrganization = () =>
  prisma.organization.findFirstOrThrow({ where: { isPlatformOrg: true } });

describe("seedPlatformCrm", () => {
  it("provisions the platform organization, roles, and platform-access grant", async () => {
    await createAdminUser("founder");

    await seedPlatformCrm();

    const platformOrganization = await findPlatformOrganization();
    expect(platformOrganization.subdomain).toBe(PLATFORM_ORGANIZATION_SUBDOMAIN);

    const roles = await prisma.role.findMany({
      where: { organizationId: platformOrganization.id },
    });
    expect(roles.map((role) => role.name).sort()).toEqual(
      [BUILT_IN_ROLE_NAME.ADMIN, BUILT_IN_ROLE_NAME.MEMBER].sort(),
    );

    const adminRole = roles.find((role) => role.name === BUILT_IN_ROLE_NAME.ADMIN);
    if (!adminRole) throw new Error("built-in Admin role was not seeded");

    const platformAccessGrant = await prisma.rolePermission.findFirst({
      where: { roleId: adminRole.id, permissionKey: PLATFORM_ACCESS_PERMISSION_KEY },
    });
    expect(platformAccessGrant).not.toBeNull();
  });

  it("makes the first admin the SUPERADMIN and grants every other admin platform access", async () => {
    const founder = await createAdminUser("founder");
    const teammate = await createAdminUser("teammate");

    await seedPlatformCrm();

    const platformOrganization = await findPlatformOrganization();

    const memberships = await prisma.membership.findMany({
      where: { organizationId: platformOrganization.id },
    });
    expect(memberships).toHaveLength(2);
    expect(memberships.every((membership) => membership.status === "ACTIVE")).toBe(true);

    const superAdminMemberships = memberships.filter(
      (membership) => membership.id === platformOrganization.superAdminMembershipId,
    );
    expect(superAdminMemberships).toHaveLength(1);

    await expect(crmAccessService.resolveHasPlatformAccess(founder.id)).resolves.toBe(true);
    await expect(crmAccessService.resolveHasPlatformAccess(teammate.id)).resolves.toBe(true);
  });

  it("leaves a non-admin account without platform access", async () => {
    await createAdminUser("founder");
    const shopper = await prisma.user.create({
      data: {
        email: `shopper-${randomUUID()}@outfiqe.test`,
        name: "Shopper",
        handle: `shopper-${randomUUID().slice(0, 8)}`,
        passwordHash: "not-used-in-tests",
        role: UserRole.CUSTOMER,
      },
    });

    await seedPlatformCrm();

    await expect(crmAccessService.resolveHasPlatformAccess(shopper.id)).resolves.toBe(false);
  });

  it("is idempotent across repeated runs", async () => {
    await createAdminUser("founder");

    await seedPlatformCrm();
    await seedPlatformCrm();

    const platformOrganizations = await prisma.organization.findMany({
      where: { isPlatformOrg: true },
    });
    expect(platformOrganizations).toHaveLength(1);

    const platformOrganization = await findPlatformOrganization();

    const roles = await prisma.role.findMany({
      where: { organizationId: platformOrganization.id },
    });
    expect(roles).toHaveLength(BUILT_IN_ROLE_COUNT);

    const memberships = await prisma.membership.findMany({
      where: { organizationId: platformOrganization.id },
    });
    expect(memberships).toHaveLength(1);
  });
});
