import { randomUUID } from "node:crypto";

import { PLATFORM_SECTION_KEYS } from "@outfiqe/utils";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { crmAccessRepository } from "#modules/crm-access/crm-access.repository.js";
import {
  createAdminSession,
  createRoleLimitedStaffSession,
} from "#test/integration/authHelpers.js";
import { seedPlatformOrganization, seedTenantOrganization } from "#test/integration/crmFixtures.js";
import { testApp } from "#test/integration/testApp.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

const fetchSessionUser = async (authHeader: string) => {
  const response = await request(testApp).get("/api/auth/me").set("Authorization", authHeader);
  expect(response.status).toBe(200);
  return response.body.data;
};

const createAccountWithRole = async (role: UserRole) => {
  const suffix = randomUUID().slice(0, 8);
  const account = await prisma.user.create({
    data: {
      email: `session-${role.toLowerCase()}-${suffix}@outfiqe.test`,
      name: "Session Tester",
      handle: `session-${suffix}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role,
    },
  });
  const { accessToken } = generateTokenpair({ sub: account.id, role });
  return { account, authHeader: `Bearer ${accessToken}` };
};

describe("the signed-in user's platform access", () => {
  it("lands a support-only staff member on the platform with only the support section visible", async () => {
    const support = await createRoleLimitedStaffSession(
      "platform:support:read",
      "platform:support:respond",
    );

    const user = await fetchSessionUser(support.authHeader);

    expect(user.hasPlatformAccess).toBe(true);
    expect(user.isCoFounder).toBe(false);
    expect(user.platformPermissionKeys.sort()).toEqual([
      "platform:support:read",
      "platform:support:respond",
    ]);
    expect(user.crmHomeSubdomain).toBeNull();

    const visibleSections = PLATFORM_SECTION_KEYS.filter(
      (sectionKey) => !user.hiddenPlatformNavKeys.includes(sectionKey),
    );
    expect(visibleSections).toEqual(["support"]);
  });

  it("shows a finance role only the finance sections", async () => {
    const finance = await createRoleLimitedStaffSession(
      "platform:finance:read",
      "platform:withdraw:manage",
    );

    const user = await fetchSessionUser(finance.authHeader);

    const visibleSections = PLATFORM_SECTION_KEYS.filter(
      (sectionKey) => !user.hiddenPlatformNavKeys.includes(sectionKey),
    );
    expect(visibleSections.sort()).toEqual([
      "bank-accounts",
      "financial-rollup",
      "withdraw-policy",
      "withdraw-requests",
    ]);
  });

  it("does not treat a role with no platform permission as platform staff", async () => {
    const noPermissions = await createRoleLimitedStaffSession();

    const user = await fetchSessionUser(noPermissions.authHeader);

    expect(user.hasPlatformAccess).toBe(false);
    expect(user.platformPermissionKeys).toEqual([]);
  });

  it("shows the built-in Admin every section except the co-founder-only ones", async () => {
    const admin = await createAdminSession();

    const user = await fetchSessionUser(admin.authHeader);

    expect(user.hasPlatformAccess).toBe(true);
    expect(user.hiddenPlatformNavKeys).toEqual(["platform-nav-access"]);
  });

  it("shows a co-founder every section", async () => {
    const coFounder = await createAdminSession();
    const platformOrganization = await crmAccessRepository.findPlatformOrganization();
    await prisma.membership.update({
      where: {
        userId_organizationId: {
          userId: coFounder.userId,
          organizationId: platformOrganization!.id,
        },
      },
      data: { isPlatformSuperAdmin: true },
    });

    const user = await fetchSessionUser(coFounder.authHeader);

    expect(user.isCoFounder).toBe(true);
    expect(user.hiddenPlatformNavKeys).toEqual([]);
  });
});

describe("the signed-in user's tenant home", () => {
  it("gives tenant staff no platform access and points them to their own tenant address", async () => {
    await seedPlatformOrganization();
    const { organization, memberRole } = await seedTenantOrganization();
    const { account, authHeader } = await createAccountWithRole(UserRole.TENANT_STAFF);
    await prisma.membership.create({
      data: { organizationId: organization.id, userId: account.id, roleId: memberRole.id },
    });

    const user = await fetchSessionUser(authHeader);

    expect(user.hasPlatformAccess).toBe(false);
    expect(user.hasCrmAccess).toBe(true);
    expect(user.platformPermissionKeys).toEqual([]);
    expect(user.crmHomeSubdomain).toBe(organization.subdomain);
  });

  it("gives shoppers no platform access and no tenant home", async () => {
    await seedPlatformOrganization();
    const { authHeader } = await createAccountWithRole(UserRole.CUSTOMER);

    const user = await fetchSessionUser(authHeader);

    expect(user.hasPlatformAccess).toBe(false);
    expect(user.crmHomeSubdomain).toBeNull();
    expect(user.platformPermissionKeys).toEqual([]);
  });

  it("never gives tenant staff platform access even if a platform membership exists for them", async () => {
    const { organization: platformOrganization, adminRole } = await seedPlatformOrganization();
    const { account, authHeader } = await createAccountWithRole(UserRole.TENANT_STAFF);
    await prisma.membership.create({
      data: { organizationId: platformOrganization.id, userId: account.id, roleId: adminRole.id },
    });

    const user = await fetchSessionUser(authHeader);

    expect(user.hasPlatformAccess).toBe(false);
    expect(user.platformPermissionKeys).toEqual([]);
  });
});
