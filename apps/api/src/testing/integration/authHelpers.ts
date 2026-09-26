import { randomUUID } from "node:crypto";

import { prisma } from "#db/prisma.js";
import { UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { crmAccessRepository } from "#modules/crm-access/crm-access.repository.js";
import {
  PLATFORM_PERMISSION_CATALOG,
  type PlatformPermissionKey,
} from "#modules/platform-access/platform-access.constants.js";

import { ensurePlatformOrganizationExists, grantPlatformStaffMembership } from "./crmFixtures.js";

export const createAdminSession = async (): Promise<{ userId: string; authHeader: string }> => {
  const suffix = randomUUID().slice(0, 8);

  const admin = await prisma.user.create({
    data: {
      email: `admin-${suffix}@outfiqe.test`,
      name: "Test Admin",
      handle: `test-admin-${suffix}`,
      phone: `98${suffix.replace(/\D/g, "0").padEnd(8, "0").slice(0, 8)}`,
      passwordHash: "not-used-in-tests",
      role: UserRole.ADMIN,
    },
  });

  await grantPlatformStaffMembership(admin.id);

  const { accessToken } = generateTokenpair({ sub: admin.id, role: UserRole.ADMIN });

  return { userId: admin.id, authHeader: `Bearer ${accessToken}` };
};

export const grantPlatformPermissions = async (
  userId: string,
  ...permissionKeys: PlatformPermissionKey[]
): Promise<void> => {
  const platformOrganization = await ensurePlatformOrganizationExists();
  const membership = await prisma.membership.findUniqueOrThrow({
    where: { userId_organizationId: { userId, organizationId: platformOrganization.id } },
  });

  await prisma.permission.createMany({
    data: PLATFORM_PERMISSION_CATALOG.map((permission) => ({ ...permission })),
    skipDuplicates: true,
  });
  await prisma.rolePermission.createMany({
    data: permissionKeys.map((permissionKey) => ({ roleId: membership.roleId, permissionKey })),
    skipDuplicates: true,
  });
};

export const createAdminSessionWithPlatformPermissions = async (
  ...permissionKeys: PlatformPermissionKey[]
): Promise<{ userId: string; authHeader: string }> => {
  const session = await createAdminSession();
  await grantPlatformPermissions(session.userId, ...permissionKeys);
  return session;
};

export const createRoleLimitedStaffSession = async (
  ...permissionKeys: PlatformPermissionKey[]
): Promise<{ userId: string; authHeader: string; roleId: string }> => {
  const suffix = randomUUID().slice(0, 8);
  const platformOrganization = await ensurePlatformOrganizationExists();

  await prisma.permission.createMany({
    data: PLATFORM_PERMISSION_CATALOG.map((permission) => ({ ...permission })),
    skipDuplicates: true,
  });

  const role = await crmAccessRepository.createRole({
    organizationId: platformOrganization.id,
    name: `Limited role ${suffix}`,
    isBuiltIn: false,
    permissionKeys,
  });

  const staffMember = await prisma.user.create({
    data: {
      email: `limited-${suffix}@outfiqe.test`,
      name: "Limited Staff",
      handle: `limited-staff-${suffix}`,
      phone: `98${suffix.replace(/\D/g, "0").padEnd(8, "0").slice(0, 8)}`,
      passwordHash: "not-used-in-tests",
      role: UserRole.ADMIN,
    },
  });
  await crmAccessRepository.grantPlatformStaffMembership(staffMember.id, role.id);

  const { accessToken } = generateTokenpair({ sub: staffMember.id, role: UserRole.ADMIN });

  return { userId: staffMember.id, authHeader: `Bearer ${accessToken}`, roleId: role.id };
};
