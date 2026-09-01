import { randomUUID } from "node:crypto";

import { addDays } from "date-fns/addDays";
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

const createUser = () =>
  prisma.user.create({
    data: {
      email: `itv-${randomUUID()}@outfiqe.test`,
      name: "Tenant Visibility Person",
      handle: `itv-${randomUUID().slice(0, 8)}`,
      passwordHash: "x",
      role: UserRole.ADMIN,
    },
  });

const seedScene = async () => {
  const { organization: platformOrg, adminRole: platformAdminRole } =
    await seedPlatformOrganization();
  await prisma.permission.createMany({
    data: PLATFORM_PERMISSION_CATALOG.map((permission) => ({ ...permission })),
    skipDuplicates: true,
  });
  await prisma.rolePermission.createMany({
    data: PLATFORM_PERMISSION_KEYS.map((permissionKey) => ({
      roleId: platformAdminRole.id,
      permissionKey,
    })),
    skipDuplicates: true,
  });
  const platformAdmin = await createUser();
  await prisma.membership.create({
    data: {
      organizationId: platformOrg.id,
      userId: platformAdmin.id,
      roleId: platformAdminRole.id,
      status: "ACTIVE",
    },
  });

  const { organization: tenant, adminRole: tenantAdminRole } = await seedTenantOrganization();
  const tenantAdmin = await createUser();
  const membership = await prisma.membership.create({
    data: {
      organizationId: tenant.id,
      userId: tenantAdmin.id,
      roleId: tenantAdminRole.id,
      status: "ACTIVE",
    },
  });
  await prisma.organization.update({
    where: { id: tenant.id },
    data: { superAdminMembershipId: membership.id, trialEndsAt: addDays(new Date(), 10) },
  });

  return {
    platformAuth: authHeaderFor(platformAdmin.id),
    tenantAuth: authHeaderFor(tenantAdmin.id),
    tenant,
    tenantAdmin,
    host: `${tenant.subdomain}.localhost`,
  };
};

const startSession = (
  platformAuth: string,
  organizationId: string,
  targetUserId: string,
  scope: "read" | "write" = "read",
) =>
  request(testApp).post("/api/platform/impersonation").set("Authorization", platformAuth).send({
    organizationId,
    targetUserId,
    reason: "checking tenant visibility",
    scope,
  });

describe("impersonation tenant visibility", () => {
  it("lists impersonation candidates for a tenant, excluding platform staff", async () => {
    const scene = await seedScene();

    const res = await request(testApp)
      .get("/api/platform/impersonation/candidates")
      .query({ organizationId: scene.tenant.id })
      .set("Authorization", scene.platformAuth);

    expect(res.status).toBe(200);
    const ids = res.body.data.map((candidate: { userId: string }) => candidate.userId);
    expect(ids).toContain(scene.tenantAdmin.id);
  });

  it("surfaces the active session on the tenant's organization payload", async () => {
    const scene = await seedScene();
    await startSession(scene.platformAuth, scene.tenant.id, scene.tenantAdmin.id);

    const res = await request(testApp)
      .get("/api/crm/organization")
      .set("Host", scene.host)
      .set("Authorization", scene.tenantAuth);

    expect(res.status).toBe(200);
    expect(res.body.data.activeImpersonation).not.toBeNull();
    expect(res.body.data.activeImpersonation.since).toBeTruthy();
  });

  it("returns the impersonation log and lets the tenant end active sessions", async () => {
    const scene = await seedScene();
    await startSession(scene.platformAuth, scene.tenant.id, scene.tenantAdmin.id);

    const log = await request(testApp)
      .get("/api/crm/organization/impersonation-log")
      .set("Host", scene.host)
      .set("Authorization", scene.tenantAuth);
    expect(log.status).toBe(200);
    expect(log.body.data.some((entry: { kind: string }) => entry.kind === "started")).toBe(true);

    const end = await request(testApp)
      .post("/api/crm/organization/end-impersonation")
      .set("Host", scene.host)
      .set("Authorization", scene.tenantAuth);
    expect(end.status).toBe(200);
    expect(end.body.data.endedCount).toBeGreaterThanOrEqual(1);

    const after = await request(testApp)
      .get("/api/crm/organization")
      .set("Host", scene.host)
      .set("Authorization", scene.tenantAuth);
    expect(after.body.data.activeImpersonation).toBeNull();
  });
});
