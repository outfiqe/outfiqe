import { addDays } from "date-fns/addDays";

import { UserRole } from "../src/generated/prisma/enums.js";
import {
  BUILT_IN_ROLE_NAME,
  BUILT_IN_ROLE_PERMISSIONS,
  PERMISSION_CATALOG,
} from "../src/modules/crm-access/crm-access.constants.js";
import { prisma } from "../src/shared/db/prisma.js";

const TRIAL_LENGTH_DAYS = 14;

async function seedPermissionCatalog() {
  for (const permission of PERMISSION_CATALOG) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      update: { label: permission.label, group: permission.group },
      create: permission,
    });
  }
}

async function seedOrganization() {
  const existing = await prisma.organization.findFirst();
  if (existing) return existing;

  return prisma.organization.create({
    data: {
      name: "Outfiqe",
      plan: "trial",
      trialEndsAt: addDays(new Date(), TRIAL_LENGTH_DAYS),
    },
  });
}

async function seedBuiltInRoles(organizationId: string) {
  for (const [roleName, permissionKeys] of Object.entries(BUILT_IN_ROLE_PERMISSIONS)) {
    const existing = await prisma.role.findFirst({ where: { organizationId, name: roleName } });
    if (existing) continue;

    await prisma.role.create({
      data: {
        organizationId,
        name: roleName,
        isBuiltIn: true,
        permissions: { create: permissionKeys.map((permissionKey) => ({ permissionKey })) },
      },
    });
  }
}

async function seedSuperAdmin(
  organizationId: string,
  currentSuperAdminMembershipId: string | null,
) {
  if (currentSuperAdminMembershipId) return;

  const adminUser = await prisma.user.findFirst({ where: { role: UserRole.ADMIN } });
  if (!adminUser) {
    console.warn("Skipping CRM SUPERADMIN seed — no ADMIN user exists yet.");
    return;
  }

  const adminRole = await prisma.role.findFirst({
    where: { organizationId, name: BUILT_IN_ROLE_NAME.ADMIN },
  });
  if (!adminRole) {
    console.warn("Skipping CRM SUPERADMIN seed — built-in Admin role wasn't seeded yet.");
    return;
  }

  const membership = await prisma.membership.upsert({
    where: { userId_organizationId: { userId: adminUser.id, organizationId } },
    update: {},
    create: { userId: adminUser.id, organizationId, roleId: adminRole.id, status: "ACTIVE" },
  });

  await prisma.organization.update({
    where: { id: organizationId },
    data: { superAdminMembershipId: membership.id },
  });
}

export async function seedCrmAccess() {
  await seedPermissionCatalog();
  const organization = await seedOrganization();
  await seedBuiltInRoles(organization.id);
  await seedSuperAdmin(organization.id, organization.superAdminMembershipId);
}
