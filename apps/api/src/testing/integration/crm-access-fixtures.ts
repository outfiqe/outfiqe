import { randomUUID } from "node:crypto";

import { prisma } from "#db/prisma.js";
import { BrandRole, UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";

import {
  BUILT_IN_ROLE_NAME,
  BUILT_IN_ROLE_PERMISSIONS,
  PERMISSION_CATALOG,
} from "../../modules/crm-access/crm-access.constants.js";
import { grantPlatformPermissions } from "./auth-helpers.js";
import { grantPlatformStaffMembership } from "./crm-fixtures.js";
import { uniquePhone } from "./unique-values.js";

export const createStaffUser = async (name: string) => {
  const slug = name.toLowerCase().replace(/\s+/g, "-");
  return prisma.user.create({
    data: {
      email: `${slug}-${randomUUID()}@outfiqe.test`,
      name,
      handle: `${slug}-${randomUUID().slice(0, 8)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role: UserRole.ADMIN,
    },
  });
};

export const createPlatformStaffUser = async (name: string) => {
  const staff = await createStaffUser(name);
  await grantPlatformStaffMembership(staff.id);
  await grantPlatformPermissions(staff.id, "platform:organizations:manage");
  return staff;
};

export const createTenantStaffUser = async (name: string) => {
  const slug = name.toLowerCase().replace(/\s+/g, "-");
  return prisma.user.create({
    data: {
      email: `${slug}-${randomUUID()}@outfiqe.test`,
      name,
      handle: `${slug}-${randomUUID().slice(0, 8)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role: UserRole.TENANT_STAFF,
    },
  });
};

export const createCustomerUser = async (name: string) => {
  const slug = name.toLowerCase().replace(/\s+/g, "-");
  return prisma.user.create({
    data: {
      email: `${slug}-${randomUUID()}@outfiqe.test`,
      name,
      handle: `${slug}-${randomUUID().slice(0, 8)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role: UserRole.CUSTOMER,
    },
  });
};

export const authHeaderFor = (userId: string) => {
  const { accessToken } = generateTokenpair({ sub: userId, role: UserRole.ADMIN });
  return `Bearer ${accessToken}`;
};

export const seedOrganization = async (overrides: { subdomain?: string } = {}) => {
  await prisma.permission.createMany({ data: PERMISSION_CATALOG, skipDuplicates: true });
  const organization = await prisma.organization.create({
    data: {
      name: `Test Org ${randomUUID()}`,
      subdomain: overrides.subdomain ?? `test-org-${randomUUID().slice(0, 8)}`,
      plan: "trial",
    },
  });

  const adminRole = await prisma.role.create({
    data: {
      organizationId: organization.id,
      name: BUILT_IN_ROLE_NAME.ADMIN,
      isBuiltIn: true,
      permissions: {
        create: BUILT_IN_ROLE_PERMISSIONS[BUILT_IN_ROLE_NAME.ADMIN].map((permissionKey) => ({
          permissionKey,
        })),
      },
    },
  });
  const memberRole = await prisma.role.create({
    data: {
      organizationId: organization.id,
      name: BUILT_IN_ROLE_NAME.MEMBER,
      isBuiltIn: true,
      permissions: {
        create: BUILT_IN_ROLE_PERMISSIONS[BUILT_IN_ROLE_NAME.MEMBER].map((permissionKey) => ({
          permissionKey,
        })),
      },
    },
  });

  return { organization, adminRole, memberRole };
};

export const addMembership = async (
  organizationId: string,
  userId: string,
  roleId: string,
  status: "ACTIVE" | "DEACTIVATED" = "ACTIVE",
) => prisma.membership.create({ data: { organizationId, userId, roleId, status } });

export const makeSuperAdmin = async (organizationId: string, membershipId: string) =>
  prisma.organization.update({
    where: { id: organizationId },
    data: { superAdminMembershipId: membershipId },
  });

export const createBrand = (name: string) =>
  prisma.brand.create({
    data: {
      name,
      contactName: "Brand Contact",
      email: `${randomUUID()}@brand.outfiqe.test`,
      phone: uniquePhone(),
      instagram: `@${randomUUID().slice(0, 8)}`,
    },
  });

export const createBrandOwner = async (brandId: string) => {
  const owner = await prisma.user.create({
    data: {
      email: `brand-owner-${randomUUID()}@outfiqe.test`,
      name: "Brand Owner",
      handle: `brand-owner-${randomUUID().slice(0, 8)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role: UserRole.BRAND_OWNER,
    },
  });
  await prisma.brandMembership.create({
    data: { userId: owner.id, brandId, role: BrandRole.OWNER },
  });
  return owner;
};
