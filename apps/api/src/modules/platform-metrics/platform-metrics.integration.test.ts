import { randomUUID } from "node:crypto";

import { startOfDay } from "date-fns/startOfDay";
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

import { platformMetricsService } from "./platform-metrics.service.js";

const authHeaderFor = (userId: string) => {
  const { accessToken } = generateTokenpair({ sub: userId, role: UserRole.ADMIN });
  return `Bearer ${accessToken}`;
};

const createUser = (role: UserRole) =>
  prisma.user.create({
    data: {
      email: `pm-${randomUUID()}@outfiqe.test`,
      name: "Metrics Person",
      handle: `pm-${randomUUID().slice(0, 8)}`,
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
  return { platformOrg: organization, auth: authHeaderFor(admin.id) };
};

const seedTenantWithCounters = async (
  plan: string,
  counters: { contactCount: number; dealCount: number; ticketCount: number; activityCount: number },
) => {
  const { organization } = await seedTenantOrganization();
  return prisma.organization.update({
    where: { id: organization.id },
    data: { plan, ...counters },
  });
};

describe("platform metrics", () => {
  it("returns platform-wide totals grouped by plan", async () => {
    const { auth } = await seedPlatformAdmin();
    await seedTenantWithCounters("starter", {
      contactCount: 5,
      dealCount: 2,
      ticketCount: 1,
      activityCount: 4,
    });
    await seedTenantWithCounters("starter", {
      contactCount: 3,
      dealCount: 1,
      ticketCount: 0,
      activityCount: 2,
    });

    const res = await request(testApp)
      .get("/api/platform/metrics/overview")
      .set("Authorization", auth);

    expect(res.status).toBe(200);
    expect(res.body.data.totalContacts).toBe(8);
    expect(res.body.data.totalDeals).toBe(3);
    expect(res.body.data.tenantsByPlan).toEqual(
      expect.arrayContaining([{ plan: "starter", count: 2 }]),
    );
  });

  it("lists one aggregate row per tenant with a plan filter", async () => {
    const { auth } = await seedPlatformAdmin();
    const starter = await seedTenantWithCounters("starter", {
      contactCount: 7,
      dealCount: 0,
      ticketCount: 0,
      activityCount: 0,
    });
    await seedTenantWithCounters("trial", {
      contactCount: 1,
      dealCount: 0,
      ticketCount: 0,
      activityCount: 0,
    });

    const res = await request(testApp)
      .get("/api/platform/metrics/tenants?plan=starter")
      .set("Authorization", auth);

    expect(res.status).toBe(200);
    expect(
      res.body.data.items.map((row: { organizationId: string }) => row.organizationId),
    ).toEqual([starter.id]);
    expect(res.body.data.items[0].contactCount).toBe(7);
    expect(res.body.data.items[0].memberCount).toBe(0);
  });

  it("returns a tenant detail with a rollup series after a snapshot runs", async () => {
    const { auth } = await seedPlatformAdmin();
    const tenant = await seedTenantWithCounters("starter", {
      contactCount: 4,
      dealCount: 2,
      ticketCount: 1,
      activityCount: 3,
    });

    const before = await request(testApp)
      .get(`/api/platform/metrics/tenants/${tenant.id}`)
      .set("Authorization", auth);
    expect(before.status).toBe(200);
    expect(before.body.data.series).toEqual([]);
    expect(before.body.data.partnerCount).toBe(0);

    await platformMetricsService.runDailySnapshot();

    const after = await request(testApp)
      .get(`/api/platform/metrics/tenants/${tenant.id}`)
      .set("Authorization", auth);
    expect(after.body.data.series).toHaveLength(1);
    expect(after.body.data.series[0]).toMatchObject({
      day: startOfDay(new Date()).toISOString().slice(0, 10),
      contactCount: 4,
      dealCount: 2,
    });
  });

  it("rejects a caller without platform:metrics:read", async () => {
    await seedPlatformAdmin();
    const shopper = await createUser(UserRole.CUSTOMER);

    const res = await request(testApp)
      .get("/api/platform/metrics/overview")
      .set("Authorization", authHeaderFor(shopper.id));
    expect(res.status).toBe(403);
  });
});
