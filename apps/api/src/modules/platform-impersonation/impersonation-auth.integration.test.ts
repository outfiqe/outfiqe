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
      email: `ia-${randomUUID()}@outfiqe.test`,
      name: "IA Person",
      handle: `ia-${randomUUID().slice(0, 8)}`,
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
  const targetMembership = await prisma.membership.create({
    data: {
      organizationId: tenant.id,
      userId: target.id,
      roleId: tenantAdminRole.id,
      status: "ACTIVE",
    },
  });
  await prisma.organization.update({
    where: { id: tenant.id },
    data: { superAdminMembershipId: targetMembership.id },
  });

  return {
    platformAuth: authHeaderFor(platformAdmin.id),
    tenant,
    target,
    host: `${tenant.subdomain}.localhost`,
  };
};

const startSession = async (
  scene: Awaited<ReturnType<typeof seedScene>>,
  scope: "read" | "write" = "read",
) => {
  const res = await request(testApp)
    .post("/api/platform/impersonation")
    .set("Authorization", scene.platformAuth)
    .send({
      organizationId: scene.tenant.id,
      targetUserId: scene.target.id,
      reason: "verify the impersonation auth path",
      scope,
    });
  expect(res.status).toBe(201);
  return { token: `Bearer ${res.body.data.token}`, sessionId: res.body.data.session.id };
};

describe("impersonation auth path", () => {
  it("lets an act-token read as the target and stamps the impersonation context", async () => {
    const scene = await seedScene();
    const { token } = await startSession(scene);

    const org = await request(testApp)
      .get("/api/crm/organization")
      .set("Host", scene.host)
      .set("Authorization", token);
    expect(org.status).toBe(200);
    expect(org.body.data.id).toBe(scene.tenant.id);
  });

  it("blocks a write-sensitive route under a read-scope session", async () => {
    const scene = await seedScene();
    const { token } = await startSession(scene, "read");

    const transfer = await request(testApp)
      .post("/api/crm/ownership-transfer")
      .set("Host", scene.host)
      .set("Authorization", token)
      .send({ toMembershipId: randomUUID() });
    expect(transfer.status).toBe(403);
    expect(transfer.body.code).toBe("IMPERSONATION_READ_ONLY");
  });

  it("401s every request the moment the session is revoked", async () => {
    const scene = await seedScene();
    const { token, sessionId } = await startSession(scene);

    const before = await request(testApp)
      .get("/api/crm/organization")
      .set("Host", scene.host)
      .set("Authorization", token);
    expect(before.status).toBe(200);

    await request(testApp)
      .delete(`/api/platform/impersonation/${sessionId}`)
      .set("Authorization", scene.platformAuth);

    const after = await request(testApp)
      .get("/api/crm/organization")
      .set("Host", scene.host)
      .set("Authorization", token);
    expect(after.status).toBe(401);
    expect(after.body.code).toBe("IMPERSONATION_ENDED");
  });
});
