import { randomUUID } from "node:crypto";

import jwt from "jsonwebtoken";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import {
  PLATFORM_PERMISSION_CATALOG,
  PLATFORM_PERMISSION_KEYS,
} from "#modules/platform-access/platform-access.constants.js";
import { platformFeaturesRepository } from "#modules/platform-features/platform-features.repository.js";
import { platformFeaturesService } from "#modules/platform-features/platform-features.service.js";
import { seedPlatformOrganization, seedTenantOrganization } from "#test/integration/crmFixtures.js";
import { testApp } from "#test/integration/testApp.js";

const authHeaderFor = (userId: string) => {
  const { accessToken } = generateTokenpair({ sub: userId, role: UserRole.ADMIN });
  return `Bearer ${accessToken}`;
};

const createUser = (role: UserRole) =>
  prisma.user.create({
    data: {
      email: `imp-${randomUUID()}@outfiqe.test`,
      name: "Imp Person",
      handle: `imp-${randomUUID().slice(0, 8)}`,
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
  return { platformOrg: organization, adminRole, admin, auth: authHeaderFor(admin.id) };
};

const seedTenantTarget = async () => {
  const { organization, adminRole } = await seedTenantOrganization();
  const target = await createUser(UserRole.ADMIN);
  await prisma.membership.create({
    data: {
      organizationId: organization.id,
      userId: target.id,
      roleId: adminRole.id,
      status: "ACTIVE",
    },
  });
  return { organization, target };
};

describe("platform impersonation", () => {
  it("starts a session, mints an act-token, and audits it", async () => {
    const { auth } = await seedPlatformAdmin();
    const { organization, target } = await seedTenantTarget();

    const res = await request(testApp)
      .post("/api/platform/impersonation")
      .set("Authorization", auth)
      .send({
        organizationId: organization.id,
        targetUserId: target.id,
        reason: "debugging ticket 42",
      });

    expect(res.status).toBe(201);
    const decoded = jwt.decode(res.body.data.token) as {
      sub: string;
      act: Record<string, unknown>;
    };
    expect(decoded.sub).toBe(target.id);
    expect(decoded.act).toMatchObject({ via: "impersonation", sid: res.body.data.session.id });

    const session = await prisma.impersonationSession.findUniqueOrThrow({
      where: { id: res.body.data.session.id },
    });
    expect(session).toMatchObject({ organizationId: organization.id, targetUserId: target.id });

    const audit = await prisma.platformAuditLog.findFirst({
      where: { impersonationSessionId: session.id, action: "impersonation.start" },
    });
    expect(audit).not.toBeNull();
  });

  it("allows only one active session per impersonator and organization", async () => {
    const { auth } = await seedPlatformAdmin();
    const { organization, target } = await seedTenantTarget();
    const body = { organizationId: organization.id, targetUserId: target.id, reason: "first look" };

    const first = await request(testApp)
      .post("/api/platform/impersonation")
      .set("Authorization", auth)
      .send(body);
    expect(first.status).toBe(201);

    const second = await request(testApp)
      .post("/api/platform/impersonation")
      .set("Authorization", auth)
      .send(body);
    expect(second.status).toBe(409);
    expect(second.body.code).toBe("SESSION_ALREADY_ACTIVE");
  });

  it("rejects a target that isn't a member, is platform staff, or when the feature is off", async () => {
    const { auth, admin, platformOrg } = await seedPlatformAdmin();
    const { organization, target } = await seedTenantTarget();

    const stranger = await createUser(UserRole.ADMIN);
    const notMember = await request(testApp)
      .post("/api/platform/impersonation")
      .set("Authorization", auth)
      .send({ organizationId: organization.id, targetUserId: stranger.id, reason: "who is this" });
    expect(notMember.status).toBe(400);

    const platformTarget = await request(testApp)
      .post("/api/platform/impersonation")
      .set("Authorization", auth)
      .send({ organizationId: platformOrg.id, targetUserId: admin.id, reason: "nope not allowed" });
    expect(platformTarget.status).toBe(403);

    await platformFeaturesRepository.upsertOverride({
      organizationId: organization.id,
      key: "impersonation.allowed",
      enabled: false,
    });
    platformFeaturesService.invalidate(organization.id);
    const disabled = await request(testApp)
      .post("/api/platform/impersonation")
      .set("Authorization", auth)
      .send({ organizationId: organization.id, targetUserId: target.id, reason: "blocked" });
    expect(disabled.status).toBe(403);
    expect(disabled.body.code).toBe("IMPERSONATION_DISABLED");
  });

  it("lists active sessions and revokes one", async () => {
    const { auth } = await seedPlatformAdmin();
    const { organization, target } = await seedTenantTarget();

    const start = await request(testApp)
      .post("/api/platform/impersonation")
      .set("Authorization", auth)
      .send({
        organizationId: organization.id,
        targetUserId: target.id,
        reason: "look then leave",
      });
    const sessionId = start.body.data.session.id;

    const active = await request(testApp)
      .get("/api/platform/impersonation/active")
      .set("Authorization", auth);
    expect(active.body.data.map((entry: { id: string }) => entry.id)).toContain(sessionId);

    const revoke = await request(testApp)
      .delete(`/api/platform/impersonation/${sessionId}`)
      .set("Authorization", auth);
    expect(revoke.status).toBe(200);

    const afterRevoke = await request(testApp)
      .get("/api/platform/impersonation/active")
      .set("Authorization", auth);
    expect(afterRevoke.body.data.map((entry: { id: string }) => entry.id)).not.toContain(sessionId);

    const endAudit = await prisma.platformAuditLog.findFirst({
      where: { impersonationSessionId: sessionId, action: "impersonation.end" },
    });
    expect(endAudit).not.toBeNull();
  });

  it("rejects a caller without platform:impersonate", async () => {
    await seedPlatformAdmin();
    const shopper = await createUser(UserRole.CUSTOMER);
    const res = await request(testApp)
      .get("/api/platform/impersonation/active")
      .set("Authorization", authHeaderFor(shopper.id));
    expect(res.status).toBe(403);
  });
});
