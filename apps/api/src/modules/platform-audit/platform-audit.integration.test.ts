import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { PLATFORM_ACCESS_PERMISSION_KEY } from "#modules/crm-access/crm-access.constants.js";
import {
  PLATFORM_PERMISSION_CATALOG,
  PLATFORM_PERMISSION_KEYS,
} from "#modules/platform-access/platform-access.constants.js";
import { seedPlatformOrganization } from "#test/integration/crmFixtures.js";
import { testApp } from "#test/integration/testApp.js";

import { platformAudit } from "./platform-audit.service.js";

const authHeaderFor = (userId: string) => {
  const { accessToken } = generateTokenpair({ sub: userId, role: UserRole.ADMIN });
  return `Bearer ${accessToken}`;
};

const createUser = (role: UserRole) =>
  prisma.user.create({
    data: {
      email: `pa-${randomUUID()}@outfiqe.test`,
      name: "Platform Person",
      handle: `pa-${randomUUID().slice(0, 8)}`,
      passwordHash: "not-used-in-tests",
      role,
    },
  });

const seedPlatform = async () => {
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

const addPlatformMember = async (organizationId: string, roleId: string) => {
  const user = await createUser(UserRole.ADMIN);
  await prisma.membership.create({
    data: { organizationId, userId: user.id, roleId, status: "ACTIVE" },
  });
  return user;
};

describe("GET /api/platform/audit", () => {
  it("records an entry and lists it back for a platform admin", async () => {
    const { organization, adminRole } = await seedPlatform();
    const admin = await addPlatformMember(organization.id, adminRole.id);

    await platformAudit.record({
      actorUserId: admin.id,
      action: "feature.override.set",
      summary: "Enabled crm.advanced for Meridian",
      organizationId: organization.id,
      metadata: { key: "crm.advanced", enabled: true },
    });

    const res = await request(testApp)
      .get("/api/platform/audit")
      .set("Authorization", authHeaderFor(admin.id));

    expect(res.status).toBe(200);
    expect(res.body.data.entries).toHaveLength(1);
    expect(res.body.data.entries[0]).toMatchObject({
      action: "feature.override.set",
      actorUserId: admin.id,
      actorName: "Platform Person",
      organizationId: organization.id,
    });
  });

  it("filters by action", async () => {
    const { organization, adminRole } = await seedPlatform();
    const admin = await addPlatformMember(organization.id, adminRole.id);

    await platformAudit.record({
      actorUserId: admin.id,
      action: "impersonation.start",
      summary: "a",
    });
    await platformAudit.record({
      actorUserId: admin.id,
      action: "feature.override.set",
      summary: "b",
    });

    const res = await request(testApp)
      .get("/api/platform/audit?action=impersonation.start")
      .set("Authorization", authHeaderFor(admin.id));

    expect(res.body.data.entries.map((entry: { action: string }) => entry.action)).toEqual([
      "impersonation.start",
    ]);
  });

  it("rejects a non-admin account", async () => {
    await seedPlatform();
    const shopper = await createUser(UserRole.CUSTOMER);

    const res = await request(testApp)
      .get("/api/platform/audit")
      .set("Authorization", authHeaderFor(shopper.id));
    expect(res.status).toBe(403);
  });

  it("rejects an admin with no platform-org membership", async () => {
    await seedPlatform();
    const stranger = await createUser(UserRole.ADMIN);

    const res = await request(testApp)
      .get("/api/platform/audit")
      .set("Authorization", authHeaderFor(stranger.id));
    expect(res.status).toBe(403);
  });

  it("rejects a platform member whose role lacks platform:audit:read", async () => {
    const { organization } = await seedPlatform();
    const limitedRole = await prisma.role.create({
      data: {
        organizationId: organization.id,
        name: "Platform access only",
        permissions: { create: [{ permissionKey: PLATFORM_ACCESS_PERMISSION_KEY }] },
      },
    });
    const limited = await addPlatformMember(organization.id, limitedRole.id);

    const res = await request(testApp)
      .get("/api/platform/audit")
      .set("Authorization", authHeaderFor(limited.id));
    expect(res.status).toBe(403);
  });
});
