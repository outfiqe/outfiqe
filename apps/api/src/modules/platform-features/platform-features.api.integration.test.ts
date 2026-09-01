import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import {
  PLATFORM_PERMISSION_CATALOG,
  PLATFORM_PERMISSION_KEYS,
} from "#modules/platform-access/platform-access.constants.js";
import { seedPlatformOrganization, seedTenantOrganization } from "#test/integration/crmFixtures.js";
import { testApp } from "#test/integration/testApp.js";

const authHeaderFor = (userId: string) => {
  const { accessToken } = generateTokenpair({ sub: userId, role: UserRole.ADMIN });
  return `Bearer ${accessToken}`;
};

const createUser = (role: UserRole) =>
  prisma.user.create({
    data: {
      email: `pf-${randomUUID()}@outfiqe.test`,
      name: "Feature Person",
      handle: `pf-${randomUUID().slice(0, 8)}`,
      passwordHash: "x",
      role,
    },
  });

const seedPlatformAdmin = async () => {
  const { organization, adminRole } = await seedPlatformOrganization();
  await prisma.permission.createMany({
    data: PLATFORM_PERMISSION_CATALOG.map((permission) => ({ ...permission })),
    skipDuplicates: true,
  });
  await prisma.rolePermission.createMany({
    data: PLATFORM_PERMISSION_KEYS.map((permissionKey) => ({
      roleId: adminRole.id,
      permissionKey,
    })),
    skipDuplicates: true,
  });
  const admin = await createUser(UserRole.ADMIN);
  await prisma.membership.create({
    data: {
      organizationId: organization.id,
      userId: admin.id,
      roleId: adminRole.id,
      status: "ACTIVE",
    },
  });
  return { auth: authHeaderFor(admin.id) };
};

describe("platform feature overrides API", () => {
  it("lists the registry and a tenant's resolved features", async () => {
    const { auth } = await seedPlatformAdmin();
    const { organization } = await seedTenantOrganization();

    const registry = await request(testApp)
      .get("/api/platform/features/registry")
      .set("Authorization", auth);
    expect(registry.status).toBe(200);
    expect(registry.body.data.map((entry: { key: string }) => entry.key)).toContain("crm.pipeline");

    const resolved = await request(testApp)
      .get(`/api/platform/features/tenants/${organization.id}`)
      .set("Authorization", auth);
    expect(resolved.status).toBe(200);
    const pipeline = resolved.body.data.find(
      (entry: { key: string }) => entry.key === "crm.pipeline",
    );
    expect(pipeline).toMatchObject({ enabled: true, source: "plan" });
  });

  it("sets and clears an override, auditing each write", async () => {
    const { auth } = await seedPlatformAdmin();
    const { organization } = await seedTenantOrganization();

    const set = await request(testApp)
      .put(`/api/platform/features/tenants/${organization.id}/gamification`)
      .set("Authorization", auth)
      .send({ enabled: false, note: "abuse review" });
    expect(set.status).toBe(200);

    const afterSet = await request(testApp)
      .get(`/api/platform/features/tenants/${organization.id}`)
      .set("Authorization", auth);
    expect(
      afterSet.body.data.find((entry: { key: string }) => entry.key === "gamification"),
    ).toMatchObject({ enabled: false, source: "override" });

    const clear = await request(testApp)
      .delete(`/api/platform/features/tenants/${organization.id}/gamification`)
      .set("Authorization", auth);
    expect(clear.status).toBe(200);

    const afterClear = await request(testApp)
      .get(`/api/platform/features/tenants/${organization.id}`)
      .set("Authorization", auth);
    expect(
      afterClear.body.data.find((entry: { key: string }) => entry.key === "gamification").source,
    ).toBe("plan");

    const auditActions = await prisma.platformAuditLog.findMany({
      where: { organizationId: organization.id },
      select: { action: true },
    });
    expect(auditActions.map((row) => row.action).sort()).toEqual(
      ["feature.override.cleared", "feature.override.set"].sort(),
    );
  });

  it("404s for an unknown organization and rejects an unknown key", async () => {
    const { auth } = await seedPlatformAdmin();

    const unknownOrg = await request(testApp)
      .get(`/api/platform/features/tenants/${randomUUID()}`)
      .set("Authorization", auth);
    expect(unknownOrg.status).toBe(404);

    const { organization } = await seedTenantOrganization();
    const unknownKey = await request(testApp)
      .put(`/api/platform/features/tenants/${organization.id}/not-a-feature`)
      .set("Authorization", auth)
      .send({ enabled: true });
    expect(unknownKey.status).toBeGreaterThanOrEqual(400);
    expect(unknownKey.status).toBeLessThan(500);
  });

  it("rejects a caller without platform:features:manage", async () => {
    await seedPlatformAdmin();
    const shopper = await createUser(UserRole.CUSTOMER);

    const res = await request(testApp)
      .get("/api/platform/features/registry")
      .set("Authorization", authHeaderFor(shopper.id));
    expect(res.status).toBe(403);
  });
});
