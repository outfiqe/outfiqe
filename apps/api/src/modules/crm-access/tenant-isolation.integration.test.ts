import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { createAdminSession } from "#test/integration/authHelpers.js";
import { seedPlatformOrganization, seedTenantOrganization } from "#test/integration/crmFixtures.js";
import { testApp } from "#test/integration/testApp.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

const tenantHost = (subdomain: string) => `${subdomain}.localhost`;

const createTenantStaff = async (organizationId: string, roleId: string) => {
  const suffix = randomUUID().slice(0, 8);
  const account = await prisma.user.create({
    data: {
      email: `tenant-staff-${suffix}@outfiqe.test`,
      name: "Tenant Staff",
      handle: `tenant-staff-${suffix}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role: UserRole.TENANT_STAFF,
    },
  });
  await prisma.membership.create({ data: { organizationId, userId: account.id, roleId } });
  const { accessToken } = generateTokenpair({ sub: account.id, role: UserRole.TENANT_STAFF });
  return { userId: account.id, authHeader: `Bearer ${accessToken}` };
};

const seedTwoTenantsWithStaff = async () => {
  await seedPlatformOrganization();
  const tenantA = await seedTenantOrganization();
  const tenantB = await seedTenantOrganization();
  const adminOfA = await createTenantStaff(tenantA.organization.id, tenantA.adminRole.id);
  const memberOfA = await createTenantStaff(tenantA.organization.id, tenantA.memberRole.id);
  const adminOfB = await createTenantStaff(tenantB.organization.id, tenantB.adminRole.id);
  return { tenantA, tenantB, adminOfA, memberOfA, adminOfB };
};

describe("tenant isolation", () => {
  it("lets tenant staff read their own organization", async () => {
    const { tenantA, adminOfA } = await seedTwoTenantsWithStaff();

    const response = await request(testApp)
      .get("/api/crm/organization")
      .set("Host", tenantHost(tenantA.organization.subdomain))
      .set("Authorization", adminOfA.authHeader);

    expect(response.status).toBe(200);
  });

  it("refuses tenant staff who address a different tenant's organization", async () => {
    const { tenantB, adminOfA } = await seedTwoTenantsWithStaff();

    const response = await request(testApp)
      .get("/api/crm/organization")
      .set("Host", tenantHost(tenantB.organization.subdomain))
      .set("Authorization", adminOfA.authHeader);

    expect(response.status).toBe(403);
  });

  it("refuses tenant staff on the bare platform address", async () => {
    const { adminOfA } = await seedTwoTenantsWithStaff();

    const response = await request(testApp)
      .get("/api/crm/organization")
      .set("Authorization", adminOfA.authHeader);

    expect(response.status).toBe(403);
  });

  it("refuses a tenant member the action their role does not include", async () => {
    const { tenantA, memberOfA } = await seedTwoTenantsWithStaff();

    const response = await request(testApp)
      .post("/api/crm/roles")
      .set("Host", tenantHost(tenantA.organization.subdomain))
      .set("Authorization", memberOfA.authHeader)
      .send({ name: "Sneaky role", permissionKeys: ["roles:manage"] });

    expect(response.status).toBe(403);
  });

  it("lets a tenant admin use the action their role includes", async () => {
    const { tenantA, adminOfA } = await seedTwoTenantsWithStaff();

    const response = await request(testApp)
      .post("/api/crm/roles")
      .set("Host", tenantHost(tenantA.organization.subdomain))
      .set("Authorization", adminOfA.authHeader)
      .send({ name: "Support desk", permissionKeys: ["tickets:read"] });

    expect(response.status).not.toBe(403);
    expect(response.status).not.toBe(401);
  });

  it("does not let one tenant's admin see another tenant's roles", async () => {
    const { tenantA, tenantB, adminOfB } = await seedTwoTenantsWithStaff();

    const ownRoles = await request(testApp)
      .get("/api/crm/roles")
      .set("Host", tenantHost(tenantB.organization.subdomain))
      .set("Authorization", adminOfB.authHeader);
    const foreignRoles = await request(testApp)
      .get("/api/crm/roles")
      .set("Host", tenantHost(tenantA.organization.subdomain))
      .set("Authorization", adminOfB.authHeader);

    expect(ownRoles.status).toBe(200);
    expect(foreignRoles.status).toBe(403);
  });

  it("keeps tenant staff out of every platform route, whatever their tenant role", async () => {
    const { adminOfA, memberOfA } = await seedTwoTenantsWithStaff();
    const platformRoutes = [
      "/api/platform/roles",
      "/api/platform/team",
      "/api/platform/metrics/overview",
      "/api/orders/admin",
      "/api/users",
      "/api/admin/invites",
      "/api/admin/financial-rollup",
      "/internal/queues",
    ];

    for (const staff of [adminOfA, memberOfA]) {
      for (const path of platformRoutes) {
        const response = await request(testApp).get(path).set("Authorization", staff.authHeader);
        expect(response.status, `GET ${path} should refuse tenant staff`).toBe(403);
      }
    }
  });

  it("keeps platform staff out of a tenant they are not a member of", async () => {
    const { tenantA } = await seedTwoTenantsWithStaff();
    const platformAdmin = await createAdminSession();

    const response = await request(testApp)
      .get("/api/crm/organization")
      .set("Host", tenantHost(tenantA.organization.subdomain))
      .set("Authorization", platformAdmin.authHeader);

    expect(response.status).toBe(403);
  });
});
