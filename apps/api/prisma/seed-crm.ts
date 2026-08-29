import { addDays } from "date-fns/addDays";

import {
  CrmBillingProvider,
  SubscriptionInvoiceStatus,
  SubscriptionStatus,
  UserRole,
} from "../src/generated/prisma/enums.js";
import {
  BUILT_IN_ROLE_NAME,
  BUILT_IN_ROLE_PERMISSIONS,
  PERMISSION_CATALOG,
  PLATFORM_ACCESS_PERMISSION_KEY,
} from "../src/modules/crm-access/crm-access.constants.js";
import { CRM_PLAN_CATALOG, CRM_PLAN_ID } from "../src/modules/crm-billing/crm-billing.constants.js";
import { DEFAULT_PIPELINE_STAGES } from "../src/modules/crm-pipeline/crm-pipeline.constants.js";
import { prisma } from "../src/shared/db/prisma.js";
import { hashPassword } from "../src/shared/utils/password.utils.js";

const TRIAL_LENGTH_DAYS = 14;
const DEFAULT_ORGANIZATION_SUBDOMAIN = "outfiqe";
const DEMO_ACCOUNT_PASSWORD = "demo-password-123";

type DemoStaffSeed = { name: string; email: string; phone: string; roleName: string };

type DemoOrganizationSeed = {
  name: string;
  subdomain: string;
  linkedBrandName: string;
  staff: DemoStaffSeed[];
};

const DEMO_ORGANIZATIONS: DemoOrganizationSeed[] = [
  {
    name: "Meridian Apparel Co.",
    subdomain: "meridian",
    linkedBrandName: "Kastha Studio",
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
    linkedBrandName: "Nepa Threads",
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
  const existing = await prisma.organization.findUnique({
    where: { subdomain: DEFAULT_ORGANIZATION_SUBDOMAIN },
  });
  if (existing) {
    if (existing.isPlatformOrg) return existing;
    return prisma.organization.update({
      where: { id: existing.id },
      data: { isPlatformOrg: true },
    });
  }

  return prisma.organization.create({
    data: {
      name: "Outfiqe",
      subdomain: DEFAULT_ORGANIZATION_SUBDOMAIN,
      isPlatformOrg: true,
      plan: "trial",
      trialEndsAt: addDays(new Date(), TRIAL_LENGTH_DAYS),
    },
  });
}

async function seedPlatformAccessGrant(organizationId: string) {
  const adminRole = await prisma.role.findFirst({
    where: { organizationId, name: BUILT_IN_ROLE_NAME.ADMIN },
  });
  if (!adminRole) return;

  await prisma.rolePermission.upsert({
    where: {
      roleId_permissionKey: { roleId: adminRole.id, permissionKey: PLATFORM_ACCESS_PERMISSION_KEY },
    },
    update: {},
    create: { roleId: adminRole.id, permissionKey: PLATFORM_ACCESS_PERMISSION_KEY },
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

async function seedPlatformStaffMemberships(organizationId: string) {
  const adminRole = await prisma.role.findFirst({
    where: { organizationId, name: BUILT_IN_ROLE_NAME.ADMIN },
  });
  if (!adminRole) {
    console.warn(
      "Skipping platform staff membership backfill — built-in Admin role wasn't seeded yet.",
    );
    return;
  }

  const unaffiliatedAdmins = await prisma.user.findMany({
    where: { role: UserRole.ADMIN, crmMemberships: { none: {} } },
  });

  for (const admin of unaffiliatedAdmins) {
    await prisma.membership.upsert({
      where: { userId_organizationId: { userId: admin.id, organizationId } },
      update: {},
      create: { userId: admin.id, organizationId, roleId: adminRole.id, status: "ACTIVE" },
    });
  }
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

async function resolveLinkedBrandId(brandName: string): Promise<string | null> {
  const brand = await prisma.brand.findFirst({ where: { name: brandName }, select: { id: true } });
  if (!brand) {
    console.warn(`Demo org linked brand "${brandName}" not found — leaving the link empty.`);
    return null;
  }
  return brand.id;
}

async function seedDemoOrganizations() {
  for (const demo of DEMO_ORGANIZATIONS) {
    const linkedBrandId = await resolveLinkedBrandId(demo.linkedBrandName);

    const existing = await prisma.organization.findUnique({
      where: { subdomain: demo.subdomain },
    });
    if (existing) {
      if (!existing.linkedBrandId && linkedBrandId) {
        await prisma.organization.update({
          where: { id: existing.id },
          data: { linkedBrandId },
        });
      }
      continue;
    }

    const organization = await prisma.organization.create({
      data: {
        name: demo.name,
        subdomain: demo.subdomain,
        plan: "trial",
        trialEndsAt: addDays(new Date(), TRIAL_LENGTH_DAYS),
        linkedBrandId,
      },
    });

    await prisma.pipelineStage.createMany({
      data: DEFAULT_PIPELINE_STAGES.map((stage) => ({
        organizationId: organization.id,
        name: stage.name,
        sortOrder: stage.sortOrder,
        isWon: stage.isWon,
        isLost: stage.isLost,
      })),
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

async function seedDemoSubscriptions() {
  const meridian = await prisma.organization.findUnique({ where: { subdomain: "meridian" } });
  if (!meridian) return;

  const existing = await prisma.subscription.findUnique({
    where: { organizationId: meridian.id },
  });
  if (existing) return;

  const seats = 5;
  const periodStart = new Date();
  const periodEnd = addDays(periodStart, 30);
  const amount = CRM_PLAN_CATALOG[CRM_PLAN_ID.STARTER].pricePerSeatPerMonth * seats;

  const subscription = await prisma.subscription.create({
    data: {
      organizationId: meridian.id,
      plan: CRM_PLAN_ID.STARTER,
      status: SubscriptionStatus.ACTIVE,
      seats,
      currentPeriodEnd: periodEnd,
    },
  });

  await prisma.subscriptionInvoice.create({
    data: {
      subscriptionId: subscription.id,
      plan: CRM_PLAN_ID.STARTER,
      seats,
      amount,
      status: SubscriptionInvoiceStatus.PAID,
      periodStart,
      periodEnd,
      provider: CrmBillingProvider.ESEWA,
      initiatedAt: periodStart,
      paidAt: periodStart,
    },
  });
}

export async function seedCrmAccess() {
  await seedPermissionCatalog();
  const organization = await seedOrganization();
  await seedBuiltInRoles(organization.id);
  await seedPlatformAccessGrant(organization.id);
  await seedSuperAdmin(organization.id, organization.superAdminMembershipId);
  await seedDemoOrganizations();
  await seedPlatformStaffMemberships(organization.id);
  await seedDemoSubscriptions();
}
