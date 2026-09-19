import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { generateOpaqueToken, hashToken } from "#lib/opaque-token.utils.js";
import { BUILT_IN_ROLE_NAME } from "#modules/crm-access/crm-access.constants.js";
import { crmAccessRepository } from "#modules/crm-access/crm-access.repository.js";
import { PLATFORM_PERMISSION_CATALOG } from "#modules/platform-access/platform-access.constants.js";
import { createAdminSession } from "#test/integration/authHelpers.js";
import { testApp } from "#test/integration/testApp.js";

beforeEach(async () => {
  await prisma.permission.createMany({
    data: PLATFORM_PERMISSION_CATALOG.map((permission) => ({ ...permission })),
    skipDuplicates: true,
  });
});

const findPlatformRoleId = async (roleName: string): Promise<string> => {
  const platformOrganization = await crmAccessRepository.findPlatformOrganization();
  if (!platformOrganization) throw new Error("platform organization missing in fixture");
  const role = await prisma.role.findFirstOrThrow({
    where: { organizationId: platformOrganization.id, name: roleName },
  });
  return role.id;
};

const makeCoFounder = async (userId: string): Promise<void> => {
  const platformOrganization = await crmAccessRepository.findPlatformOrganization();
  if (!platformOrganization) throw new Error("platform organization missing in fixture");
  await prisma.membership.update({
    where: { userId_organizationId: { userId, organizationId: platformOrganization.id } },
    data: { isPlatformSuperAdmin: true },
  });
};

describe("GET /api/platform/permissions", () => {
  it("only returns platform-catalog keys, never CRM-catalog keys", async () => {
    const staffer = await createAdminSession();

    const response = await request(testApp)
      .get("/api/platform/permissions")
      .set("Authorization", staffer.authHeader)
      .expect(200);

    const keys = (response.body.data as { key: string }[]).map((permission) => permission.key);
    expect(keys).toContain("platform:withdraw:manage");
    expect(keys).not.toContain("tickets:read");
    expect(keys).not.toContain("platform:access");
  });
});

describe("POST /api/platform/roles", () => {
  it("blocks a plain platform staffer", async () => {
    const staffer = await createAdminSession();

    const response = await request(testApp)
      .post("/api/platform/roles")
      .set("Authorization", staffer.authHeader)
      .send({ name: "Finance only", permissionKeys: ["platform:withdraw:manage"] });

    expect(response.status).toBe(403);
  });

  it("creates a custom role for a co-founder", async () => {
    const founder = await createAdminSession();
    await makeCoFounder(founder.userId);

    const response = await request(testApp)
      .post("/api/platform/roles")
      .set("Authorization", founder.authHeader)
      .send({ name: "Finance only", permissionKeys: ["platform:withdraw:manage"] });

    expect(response.status).toBe(201);
    expect(response.body.data.permissionKeys).toEqual(["platform:withdraw:manage"]);

    const platformOrganization = await crmAccessRepository.findPlatformOrganization();
    const stored = await prisma.role.findFirstOrThrow({
      where: { organizationId: platformOrganization!.id, name: "Finance only" },
      include: { permissions: true },
    });
    expect(stored.permissions.map((permission) => permission.permissionKey)).toEqual([
      "platform:withdraw:manage",
    ]);
  });

  it("rejects a CRM-only permission key", async () => {
    const founder = await createAdminSession();
    await makeCoFounder(founder.userId);

    const response = await request(testApp)
      .post("/api/platform/roles")
      .set("Authorization", founder.authHeader)
      .send({ name: "Sneaky", permissionKeys: ["tickets:read"] });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("INVALID_PERMISSION_KEYS");
  });
});

describe("PATCH /api/platform/roles/:roleId", () => {
  it("refuses to edit a built-in role", async () => {
    const founder = await createAdminSession();
    await makeCoFounder(founder.userId);
    const adminRoleId = await findPlatformRoleId(BUILT_IN_ROLE_NAME.ADMIN);

    const response = await request(testApp)
      .patch(`/api/platform/roles/${adminRoleId}`)
      .set("Authorization", founder.authHeader)
      .send({ name: "Renamed admin" });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("ROLE_IS_BUILT_IN");
  });
});

describe("DELETE /api/platform/roles/:roleId", () => {
  it("blocks deleting a role that still has an active member", async () => {
    const founder = await createAdminSession();
    await makeCoFounder(founder.userId);

    const created = await request(testApp)
      .post("/api/platform/roles")
      .set("Authorization", founder.authHeader)
      .send({ name: "Occupied", permissionKeys: ["platform:withdraw:manage"] });

    const teammate = await createAdminSession();
    const platformOrganization = await crmAccessRepository.findPlatformOrganization();
    await prisma.membership.update({
      where: {
        userId_organizationId: {
          userId: teammate.userId,
          organizationId: platformOrganization!.id,
        },
      },
      data: { roleId: created.body.data.id },
    });

    const response = await request(testApp)
      .delete(`/api/platform/roles/${created.body.data.id}`)
      .set("Authorization", founder.authHeader);

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("ROLE_IN_USE");
  });

  it("blocks deleting a role that a pending invite still references", async () => {
    const founder = await createAdminSession();
    await makeCoFounder(founder.userId);

    const created = await request(testApp)
      .post("/api/platform/roles")
      .set("Authorization", founder.authHeader)
      .send({ name: "Invited Role", permissionKeys: ["platform:withdraw:manage"] });

    await prisma.adminInvite.create({
      data: {
        email: "pending@outfiqe.test",
        name: "Pending",
        roleId: created.body.data.id,
        tokenHash: hashToken(generateOpaqueToken()),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        invitedById: founder.userId,
      },
    });

    const response = await request(testApp)
      .delete(`/api/platform/roles/${created.body.data.id}`)
      .set("Authorization", founder.authHeader);

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("ROLE_IN_USE");
  });

  it("deletes an unused custom role", async () => {
    const founder = await createAdminSession();
    await makeCoFounder(founder.userId);

    const created = await request(testApp)
      .post("/api/platform/roles")
      .set("Authorization", founder.authHeader)
      .send({ name: "Temporary", permissionKeys: ["platform:withdraw:manage"] });

    const response = await request(testApp)
      .delete(`/api/platform/roles/${created.body.data.id}`)
      .set("Authorization", founder.authHeader);

    expect(response.status).toBe(200);
    expect(await prisma.role.findUnique({ where: { id: created.body.data.id } })).toBeNull();
  });
});

describe("PATCH /api/platform/team/:membershipId", () => {
  it("blocks a plain platform staffer from reassigning someone else's role", async () => {
    const staffer = await createAdminSession();
    const teammate = await createAdminSession();
    const platformOrganization = await crmAccessRepository.findPlatformOrganization();
    const memberRoleId = await findPlatformRoleId(BUILT_IN_ROLE_NAME.MEMBER);
    const teammateMembership = await prisma.membership.findUniqueOrThrow({
      where: {
        userId_organizationId: {
          userId: teammate.userId,
          organizationId: platformOrganization!.id,
        },
      },
    });

    const response = await request(testApp)
      .patch(`/api/platform/team/${teammateMembership.id}`)
      .set("Authorization", staffer.authHeader)
      .send({ roleId: memberRoleId });

    expect(response.status).toBe(403);
  });

  it("lets a co-founder reassign another member's role", async () => {
    const founder = await createAdminSession();
    await makeCoFounder(founder.userId);
    const teammate = await createAdminSession();
    const platformOrganization = await crmAccessRepository.findPlatformOrganization();
    const memberRoleId = await findPlatformRoleId(BUILT_IN_ROLE_NAME.MEMBER);
    const teammateMembership = await prisma.membership.findUniqueOrThrow({
      where: {
        userId_organizationId: {
          userId: teammate.userId,
          organizationId: platformOrganization!.id,
        },
      },
    });

    const response = await request(testApp)
      .patch(`/api/platform/team/${teammateMembership.id}`)
      .set("Authorization", founder.authHeader)
      .send({ roleId: memberRoleId });

    expect(response.status).toBe(200);
    const stored = await prisma.membership.findUniqueOrThrow({
      where: { id: teammateMembership.id },
    });
    expect(stored.roleId).toBe(memberRoleId);
  });

  it("blocks a co-founder from changing their own membership through this route", async () => {
    const founder = await createAdminSession();
    await makeCoFounder(founder.userId);
    const platformOrganization = await crmAccessRepository.findPlatformOrganization();
    const memberRoleId = await findPlatformRoleId(BUILT_IN_ROLE_NAME.MEMBER);
    const ownMembership = await prisma.membership.findUniqueOrThrow({
      where: {
        userId_organizationId: { userId: founder.userId, organizationId: platformOrganization!.id },
      },
    });

    const response = await request(testApp)
      .patch(`/api/platform/team/${ownMembership.id}`)
      .set("Authorization", founder.authHeader)
      .send({ roleId: memberRoleId });

    expect(response.status).toBe(403);
  });
});
