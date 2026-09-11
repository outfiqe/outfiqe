import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { hashPassword } from "#lib/password.utils.js";
import {
  PLATFORM_PERMISSION_CATALOG,
  PLATFORM_PERMISSION_KEYS,
} from "#modules/platform-access/platform-access.constants.js";
import { seedPlatformOrganization } from "#test/integration/crmFixtures.js";
import { testApp } from "#test/integration/testApp.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

const DEFAULT_TEST_PASSWORD = "correct-horse-battery";

const authHeaderFor = (userId: string, role: UserRole = UserRole.ADMIN) => {
  const { accessToken } = generateTokenpair({ sub: userId, role });
  return `Bearer ${accessToken}`;
};

const createUser = (overrides: { role?: UserRole } = {}) => {
  const suffix = randomUUID().slice(0, 8);
  return prisma.user.create({
    data: {
      email: `suspensions-${suffix}@outfiqe.test`,
      name: "Test Target",
      handle: `suspensions-${suffix}`,
      phone: uniquePhone(),
      role: overrides.role ?? UserRole.CUSTOMER,
      emailVerified: true,
    },
  });
};

const createUserWithPassword = async (password: string = DEFAULT_TEST_PASSWORD) => {
  const suffix = randomUUID().slice(0, 8);
  const user = await prisma.user.create({
    data: {
      email: `suspensions-${suffix}@outfiqe.test`,
      name: "Test Target",
      handle: `suspensions-${suffix}`,
      phone: uniquePhone(),
      passwordHash: await hashPassword(password),
      emailVerified: true,
    },
  });
  return { user, password };
};

const seedPlatformAdminRole = async () => {
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
  return { organization, adminRole };
};

const addPlatformAdmin = async (organizationId: string, roleId: string) => {
  const admin = await createUser({ role: UserRole.ADMIN });
  await prisma.membership.create({
    data: { organizationId, userId: admin.id, roleId, status: "ACTIVE" },
  });
  return admin;
};

describe("platform suspensions", () => {
  let adminAuth: string;
  let admin: { id: string };
  let platformOrg: { id: string };
  let adminRoleId: string;

  beforeEach(async () => {
    const { organization, adminRole } = await seedPlatformAdminRole();
    platformOrg = organization;
    adminRoleId = adminRole.id;
    admin = await addPlatformAdmin(organization.id, adminRole.id);
    adminAuth = authHeaderFor(admin.id);
  });

  it("suspends a user, revokes their sessions, and blocks login", async () => {
    const { user, password } = await createUserWithPassword();
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: randomUUID(),
        familyId: randomUUID(),
        expiresAt: new Date(Date.now() + 60_000),
      },
    });

    const res = await request(testApp)
      .post(`/api/platform/users/${user.id}/suspend`)
      .set("Authorization", adminAuth)
      .send({ reason: "Spam reports from multiple users", durationHours: 24 });

    expect(res.status).toBe(200);

    const suspended = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(suspended.accountStatus).toBe("SUSPENDED");
    expect(suspended.suspendedBy).toBe(admin.id);
    expect(suspended.suspensionReason).toBe("Spam reports from multiple users");
    expect(suspended.suspensionExpiresAt).not.toBeNull();

    const remainingTokens = await prisma.refreshToken.count({ where: { userId: user.id } });
    expect(remainingTokens).toBe(0);

    const auditRow = await prisma.platformAuditLog.findFirst({
      where: { action: "user.suspended", targetId: user.id },
    });
    expect(auditRow?.actorUserId).toBe(admin.id);

    const login = await request(testApp)
      .post("/api/auth/login")
      .send({ email: user.email, password });
    expect(login.status).toBe(403);
    expect(login.body.code).toBe("ACCOUNT_SUSPENDED");
  });

  it("is a safe no-op conflict when suspending an already-suspended account", async () => {
    const { user } = await createUserWithPassword();

    await request(testApp)
      .post(`/api/platform/users/${user.id}/suspend`)
      .set("Authorization", adminAuth)
      .send({ reason: "First suspension" });

    const second = await request(testApp)
      .post(`/api/platform/users/${user.id}/suspend`)
      .set("Authorization", adminAuth)
      .send({ reason: "Second attempt" });

    expect(second.status).toBe(409);
    expect(second.body.code).toBe("ALREADY_SUSPENDED");

    const auditRows = await prisma.platformAuditLog.findMany({
      where: { action: "user.suspended", targetId: user.id },
    });
    expect(auditRows).toHaveLength(1);
  });

  it("unsuspends a user and restores login access", async () => {
    const { user, password } = await createUserWithPassword();
    await request(testApp)
      .post(`/api/platform/users/${user.id}/suspend`)
      .set("Authorization", adminAuth)
      .send({ reason: "Under review" });

    const res = await request(testApp)
      .post(`/api/platform/users/${user.id}/unsuspend`)
      .set("Authorization", adminAuth)
      .send();
    expect(res.status).toBe(200);

    const restored = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(restored.accountStatus).toBe("ACTIVE");
    expect(restored.suspensionReason).toBeNull();

    const login = await request(testApp)
      .post("/api/auth/login")
      .send({ email: user.email, password });
    expect(login.status).toBe(200);
  });

  it("rejects unsuspending an account that isn't suspended", async () => {
    const { user } = await createUserWithPassword();

    const res = await request(testApp)
      .post(`/api/platform/users/${user.id}/unsuspend`)
      .set("Authorization", adminAuth)
      .send();

    expect(res.status).toBe(409);
    expect(res.body.code).toBe("NOT_SUSPENDED");
  });

  it("requires a different admin than the one who imposed the ban to lift it", async () => {
    const { user } = await createUserWithPassword();

    const banRes = await request(testApp)
      .post(`/api/platform/users/${user.id}/ban`)
      .set("Authorization", adminAuth)
      .send({ reason: "Severe policy violation" });
    expect(banRes.status).toBe(200);

    const sameAdminUnban = await request(testApp)
      .post(`/api/platform/users/${user.id}/unban`)
      .set("Authorization", adminAuth)
      .send();
    expect(sameAdminUnban.status).toBe(403);
    expect(sameAdminUnban.body.code).toBe("BAN_REQUIRES_SECOND_ADMIN");

    const secondAdmin = await addPlatformAdmin(platformOrg.id, adminRoleId);
    const secondAdminUnban = await request(testApp)
      .post(`/api/platform/users/${user.id}/unban`)
      .set("Authorization", authHeaderFor(secondAdmin.id))
      .send();
    expect(secondAdminUnban.status).toBe(200);

    const restored = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(restored.accountStatus).toBe("ACTIVE");
  });

  it("refuses to suspend an admin account", async () => {
    const targetAdmin = await createUser({ role: UserRole.ADMIN });

    const res = await request(testApp)
      .post(`/api/platform/users/${targetAdmin.id}/suspend`)
      .set("Authorization", adminAuth)
      .send({ reason: "Attempted lockout" });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("CANNOT_MODERATE_ADMIN");
  });

  it("refuses to let an admin suspend their own account", async () => {
    const res = await request(testApp)
      .post(`/api/platform/users/${admin.id}/suspend`)
      .set("Authorization", adminAuth)
      .send({ reason: "Self-suspend attempt" });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("CANNOT_MODERATE_SELF");
  });

  it("blocks a caller without the suspensions permission", async () => {
    const { user } = await createUserWithPassword();
    const bystander = await createUser();

    const res = await request(testApp)
      .post(`/api/platform/users/${user.id}/suspend`)
      .set("Authorization", authHeaderFor(bystander.id, UserRole.CUSTOMER))
      .send({ reason: "Should be blocked" });

    expect(res.status).toBe(403);
  });
});
