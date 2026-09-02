import { randomUUID } from "node:crypto";

import { prisma } from "#db/prisma.js";
import { isUniqueConstraintError } from "#lib/prisma.utils.js";
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

const PLATFORM_ORGANIZATION_SUBDOMAIN = "platform-org";

export const seedPlatformOrganization = async (): Promise<{
  organization: OrganizationRecord;
  adminRole: RoleWithPermissions;
  memberRole: RoleWithPermissions;
}> => {
  await prisma.permission.createMany({ data: PERMISSION_CATALOG, skipDuplicates: true });
  const organization = await prisma.organization.create({
    data: {
      name: `Platform Org ${randomUUID()}`,
      subdomain: PLATFORM_ORGANIZATION_SUBDOMAIN,
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

  try {
    const { organization } = await seedPlatformOrganization();
    return organization;
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
    const seededByAnotherCaller = await crmAccessRepository.findPlatformOrganization();
    if (!seededByAnotherCaller) throw error;
    return seededByAnotherCaller;
  }
};

export const seedTenantOrganization = async (
  options: { linkedBrandId?: string } = {},
): Promise<{
  organization: OrganizationRecord;
  adminRole: RoleWithPermissions;
  memberRole: RoleWithPermissions;
}> => {
  await prisma.permission.createMany({ data: PERMISSION_CATALOG, skipDuplicates: true });
  const organization = await prisma.organization.create({
    data: {
      name: `Tenant Org ${randomUUID()}`,
      subdomain: `tenant-${randomUUID().slice(0, 8)}`,
      plan: "trial",
      linkedBrandId: options.linkedBrandId ?? null,
    },
  });

  const adminRole = await crmAccessRepository.createRole({
    organizationId: organization.id,
    name: BUILT_IN_ROLE_NAME.ADMIN,
    isBuiltIn: true,
    permissionKeys: BUILT_IN_ROLE_PERMISSIONS[BUILT_IN_ROLE_NAME.ADMIN],
  });
  const memberRole = await crmAccessRepository.createRole({
    organizationId: organization.id,
    name: BUILT_IN_ROLE_NAME.MEMBER,
    isBuiltIn: true,
    permissionKeys: BUILT_IN_ROLE_PERMISSIONS[BUILT_IN_ROLE_NAME.MEMBER],
  });

  return { organization, adminRole, memberRole };
};
