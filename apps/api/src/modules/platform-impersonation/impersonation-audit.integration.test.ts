import { randomUUID } from "node:crypto";

import { addDays } from "date-fns/addDays";
import { subMinutes } from "date-fns/subMinutes";
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

import { platformImpersonationService } from "./platform-impersonation.service.js";

const authHeaderFor = (userId: string) => {
  const { accessToken } = generateTokenpair({ sub: userId, role: UserRole.ADMIN });
  return `Bearer ${accessToken}`;
};

const createUser = (role: UserRole) =>
  prisma.user.create({
    data: {
      email: `iaud-${randomUUID()}@outfiqe.test`,
      name: "Audit Person",
      handle: `iaud-${randomUUID().slice(0, 8)}`,
      passwordHash: "x",
      role,
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
  const platformAdmin = await createUser(UserRole.ADMIN);
  await prisma.membership.create({
    data: {
      organizationId: platformOrg.id,
      userId: platformAdmin.id,
      roleId: platformAdminRole.id,
      status: "ACTIVE",
    },
  });

  const { organization: tenant, adminRole: tenantAdminRole } = await seedTenantOrganization();
  const target = await createUser(UserRole.ADMIN);
  const membership = await prisma.membership.create({
    data: {
      organizationId: tenant.id,
      userId: target.id,
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
    tenant,
    target,
    host: `${tenant.subdomain}.localhost`,
  };
};

describe("impersonation request audit", () => {
  it("writes a tenant.request row for a write made under impersonation and touches lastSeenAt", async () => {
    const scene = await seedScene();
    const start = await request(testApp)
      .post("/api/platform/impersonation")
      .set("Authorization", scene.platformAuth)
      .send({
        organizationId: scene.tenant.id,
        targetUserId: scene.target.id,
        reason: "make a change and check the trail",
        scope: "write",
      });
    const token = `Bearer ${start.body.data.token}`;
    const sessionId = start.body.data.session.id;

    const created = await request(testApp)
      .post("/api/crm/contacts")
      .set("Host", scene.host)
      .set("Authorization", token)
      .send({ name: "Impersonated Contact" });
    expect(created.status).toBe(201);

    const findAuditRow = () =>
      prisma.platformAuditLog.findFirst({
        where: { impersonationSessionId: sessionId, action: "tenant.request", method: "POST" },
      });

    await expect.poll(findAuditRow, { timeout: 5000 }).not.toBeNull();

    const auditRow = await findAuditRow();
    expect(auditRow?.path).toContain("/contacts");
    expect(auditRow?.statusCode).toBe(201);
    expect(auditRow?.onBehalfOfUserId).toBe(scene.target.id);

    await expect
      .poll(
        () =>
          prisma.impersonationSession
            .findUniqueOrThrow({ where: { id: sessionId } })
            .then((session) => session.lastSeenAt),
        { timeout: 5000 },
      )
      .not.toBeNull();
  });

  it("reaps expired sessions", async () => {
    const scene = await seedScene();
    const session = await prisma.impersonationSession.create({
      data: {
        organizationId: scene.tenant.id,
        impersonatorId: scene.target.id,
        targetUserId: scene.target.id,
        reason: "already stale",
        expiresAt: subMinutes(new Date(), 5),
      },
    });

    const reaped = await platformImpersonationService.reapExpiredSessions();
    expect(reaped).toBeGreaterThanOrEqual(1);

    const after = await prisma.impersonationSession.findUniqueOrThrow({
      where: { id: session.id },
    });
    expect(after.revokedAt).not.toBeNull();
  });
});
