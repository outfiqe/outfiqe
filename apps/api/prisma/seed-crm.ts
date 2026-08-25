import { addDays } from "date-fns/addDays";

import { UserRole } from "../src/generated/prisma/enums.js";
import {
  BUILT_IN_ROLE_NAME,
  BUILT_IN_ROLE_PERMISSIONS,
  PERMISSION_CATALOG,
} from "../src/modules/crm-access/crm-access.constants.js";
import { prisma } from "../src/shared/db/prisma.js";
import { hashPassword } from "../src/shared/utils/password.utils.js";

const TRIAL_LENGTH_DAYS = 14;
const DEFAULT_ORGANIZATION_SUBDOMAIN = "outfiqe";
const DEMO_ACCOUNT_PASSWORD = "demo-password-123";

type DemoStaffSeed = { name: string; email: string; phone: string; roleName: string };

type DemoOrganizationSeed = {
  name: string;
  subdomain: string;
  staff: DemoStaffSeed[];
};

const DEMO_ORGANIZATIONS: DemoOrganizationSeed[] = [
  {
    name: "Meridian Apparel Co.",
    subdomain: "meridian",
    staff: [
      {
        name: "Bipin Karki",
        email: "bipin.karki@meridianapparel.test",
        phone: "9841000001",
        roleName: BUILT_IN_ROLE_NAME.ADMIN,
      },
      {
        name: "Sunita Adhikari",
        email: "sunita.adhikari@meridianapparel.test",
        phone: "9841000002",
        roleName: BUILT_IN_ROLE_NAME.MEMBER,
      },
      {
        name: "Nischal Rana",
        email: "nischal.rana@meridianapparel.test",
        phone: "9841000003",
        roleName: BUILT_IN_ROLE_NAME.MEMBER,
      },
    ],
  },
  {
    name: "Norday Studio",
    subdomain: "norday",
    staff: [
      {
        name: "Prapti Basnet",
        email: "prapti.basnet@nordaystudio.test",
        phone: "9841000004",
        roleName: BUILT_IN_ROLE_NAME.ADMIN,
      },
      {
        name: "Suraj Thapa Magar",
        email: "suraj.thapamagar@nordaystudio.test",
        phone: "9841000005",
        roleName: BUILT_IN_ROLE_NAME.ADMIN,
      },
    ],
  },
];

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
      subdomain: DEFAULT_ORGANIZATION_SUBDOMAIN,
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

async function seedDemoStaffUser(staff: DemoStaffSeed) {
  return prisma.user.upsert({
    where: { email: staff.email },
    update: {},
    create: {
      email: staff.email,
      name: staff.name,
      handle: staff.email.split("@")[0].replace(/\./g, "-"),
      phone: staff.phone,
      passwordHash: await hashPassword(DEMO_ACCOUNT_PASSWORD),
      role: UserRole.ADMIN,
      emailVerified: true,
    },
  });
}

async function seedDemoOrganizations() {
  for (const demo of DEMO_ORGANIZATIONS) {
    const existing = await prisma.organization.findUnique({
      where: { subdomain: demo.subdomain },
    });
    if (existing) continue;

    const organization = await prisma.organization.create({
      data: {
        name: demo.name,
        subdomain: demo.subdomain,
        plan: "trial",
        trialEndsAt: addDays(new Date(), TRIAL_LENGTH_DAYS),
      },
    });

    const roleIdByName = new Map<string, string>();
    for (const [roleName, permissionKeys] of Object.entries(BUILT_IN_ROLE_PERMISSIONS)) {
      const role = await prisma.role.create({
        data: {
          organizationId: organization.id,
          name: roleName,
          isBuiltIn: true,
          permissions: { create: permissionKeys.map((permissionKey) => ({ permissionKey })) },
        },
      });
      roleIdByName.set(roleName, role.id);
    }

    let superAdminMembershipId: string | undefined;
    for (const staff of demo.staff) {
      const staffUser = await seedDemoStaffUser(staff);
      const roleId = roleIdByName.get(staff.roleName);
      if (!roleId) continue;

      const membership = await prisma.membership.create({
        data: { userId: staffUser.id, organizationId: organization.id, roleId, status: "ACTIVE" },
      });
      superAdminMembershipId ??= membership.id;
    }

    if (superAdminMembershipId) {
      await prisma.organization.update({
        where: { id: organization.id },
        data: { superAdminMembershipId },
      });
    }
  }
}

export async function seedCrmAccess() {
  await seedPermissionCatalog();
  const organization = await seedOrganization();
  await seedBuiltInRoles(organization.id);
  await seedSuperAdmin(organization.id, organization.superAdminMembershipId);
  await seedDemoOrganizations();
}
