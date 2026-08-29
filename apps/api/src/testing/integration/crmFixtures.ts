import { randomUUID } from "node:crypto";

import { prisma } from "#db/prisma.js";
import {
  BUILT_IN_ROLE_NAME,
  BUILT_IN_ROLE_PERMISSIONS,
  PERMISSION_CATALOG,
  PLATFORM_ACCESS_PERMISSION_KEY,
} from "#modules/crm-access/crm-access.constants.js";
import { crmAccessRepository } from "#modules/crm-access/crm-access.repository.js";
import type {
  OrganizationRecord,
  RoleWithPermissions,
} from "#modules/crm-access/crm-access.types.js";

export const seedPlatformOrganization = async (): Promise<{
  organization: OrganizationRecord;
  adminRole: RoleWithPermissions;
  memberRole: RoleWithPermissions;
}> => {
  await prisma.permission.createMany({ data: PERMISSION_CATALOG, skipDuplicates: true });
  const organization = await prisma.organization.create({
    data: {
      name: `Platform Org ${randomUUID()}`,
      subdomain: `platform-org-${randomUUID().slice(0, 8)}`,
      isPlatformOrg: true,
      plan: "trial",
    },
  });

  const adminRole = await crmAccessRepository.createRole({
    organizationId: organization.id,
    name: BUILT_IN_ROLE_NAME.ADMIN,
    isBuiltIn: true,
    permissionKeys: [
      ...BUILT_IN_ROLE_PERMISSIONS[BUILT_IN_ROLE_NAME.ADMIN],
      PLATFORM_ACCESS_PERMISSION_KEY,
    ],
  });
  const memberRole = await crmAccessRepository.createRole({
    organizationId: organization.id,
    name: BUILT_IN_ROLE_NAME.MEMBER,
    isBuiltIn: true,
    permissionKeys: BUILT_IN_ROLE_PERMISSIONS[BUILT_IN_ROLE_NAME.MEMBER],
  });

  return { organization, adminRole, memberRole };
};

export const ensurePlatformOrganizationExists = async (): Promise<OrganizationRecord> => {
  const existing = await crmAccessRepository.findPlatformOrganization();
  if (existing) return existing;

  const { organization } = await seedPlatformOrganization();
  return organization;
};
