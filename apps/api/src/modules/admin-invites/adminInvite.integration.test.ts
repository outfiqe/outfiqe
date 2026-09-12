import { addDays } from "date-fns/addDays";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { hashToken } from "#lib/opaque-token.utils.js";
import { crmAccessRepository } from "#modules/crm-access/crm-access.repository.js";
import { PLATFORM_PERMISSION_CATALOG } from "#modules/platform-access/platform-access.constants.js";
import { createAdminSession } from "#test/integration/authHelpers.js";
import { testApp } from "#test/integration/testApp.js";

const TEAM_MANAGE_PERMISSION_KEY = "platform:team:manage";

const seedInvite = async (email: string, invitedById: string) => {
  await prisma.adminInvite.create({
    data: {
      email,
      name: email.split("@")[0]!,
      tokenHash: hashToken(`token-${email}`),
      expiresAt: addDays(new Date(), 7),
      invitedById,
    },
  });
};

const findPlatformStaffMembership = async (userId: string) => {
  const platformOrganization = await crmAccessRepository.findPlatformOrganization();
  if (!platformOrganization) throw new Error("platform organization missing in fixture");

  return prisma.membership.findUniqueOrThrow({
    where: { userId_organizationId: { userId, organizationId: platformOrganization.id } },
  });
};

const grantPlatformPermission = async (userId: string, permissionKey: string) => {
  const membership = await findPlatformStaffMembership(userId);
  await prisma.permission.createMany({
    data: PLATFORM_PERMISSION_CATALOG.map((permission) => ({ ...permission })),
    skipDuplicates: true,
  });
  await prisma.rolePermission.create({ data: { roleId: membership.roleId, permissionKey } });
};

const makePlatformSuperAdmin = async (userId: string) => {
  const membership = await findPlatformStaffMembership(userId);
  await prisma.organization.update({
    where: { id: membership.organizationId },
    data: { superAdminMembershipId: membership.id },
  });
};

describe("GET /api/admin/invites", () => {
  it("flags the row whose email belongs to an active platform co-founder", async () => {
    const requester = await createAdminSession();
    const coFounder = await createAdminSession();

    const platformOrganization = await crmAccessRepository.findPlatformOrganization();
    if (!platformOrganization) throw new Error("platform organization missing in fixture");
    await prisma.membership.update({
      where: {
        userId_organizationId: {
          userId: coFounder.userId,
          organizationId: platformOrganization.id,
        },
      },
      data: { isPlatformSuperAdmin: true },
    });

    const coFounderUser = await prisma.user.findUniqueOrThrow({
      where: { id: coFounder.userId },
      select: { email: true },
    });
    await seedInvite(coFounderUser.email, requester.userId);
    await seedInvite("outsider@outfiqe.test", requester.userId);

    const response = await request(testApp)
      .get("/api/admin/invites")
      .set("Authorization", requester.authHeader)
      .expect(200);

    const { invites: summaries }: { invites: { email: string; isCoFounder: boolean }[] } =
      response.body.data;
    const byEmail = new Map(summaries.map((summary) => [summary.email, summary.isCoFounder]));

    expect(byEmail.get(coFounderUser.email)).toBe(true);
    expect(byEmail.get("outsider@outfiqe.test")).toBe(false);
  });

  it("returns isCoFounder: false for every row when there are no co-founders", async () => {
    const requester = await createAdminSession();
    await seedInvite("pending-one@outfiqe.test", requester.userId);
    await seedInvite("pending-two@outfiqe.test", requester.userId);

    const response = await request(testApp)
      .get("/api/admin/invites")
      .set("Authorization", requester.authHeader)
      .expect(200);

    const { invites: summaries }: { invites: { isCoFounder: boolean }[] } = response.body.data;
    expect(summaries).toHaveLength(2);
    expect(summaries.every((summary) => summary.isCoFounder === false)).toBe(true);
  });

  it("reports the requester's own platform permission keys alongside the invites", async () => {
    const requester = await createAdminSession();

    const response = await request(testApp)
      .get("/api/admin/invites")
      .set("Authorization", requester.authHeader)
      .expect(200);

    const { viewerPermissionKeys }: { viewerPermissionKeys: string[] } = response.body.data;
    expect(viewerPermissionKeys).not.toContain(TEAM_MANAGE_PERMISSION_KEY);

    await grantPlatformPermission(requester.userId, TEAM_MANAGE_PERMISSION_KEY);

    const responseAfterGrant = await request(testApp)
      .get("/api/admin/invites")
      .set("Authorization", requester.authHeader)
      .expect(200);

    expect(responseAfterGrant.body.data.viewerPermissionKeys).toContain(TEAM_MANAGE_PERMISSION_KEY);
  });
});

describe("POST /api/admin/invites", () => {
  const inviteBody = { email: "new-admin@outfiqe.test", name: "New Admin" };

  it("blocks a platform staffer without platform:team:manage", async () => {
    const staffer = await createAdminSession();

    const response = await request(testApp)
      .post("/api/admin/invites")
      .set("Authorization", staffer.authHeader)
      .send(inviteBody);

    expect(response.status).toBe(403);
    const invite = await prisma.adminInvite.findFirst({ where: { email: inviteBody.email } });
    expect(invite).toBeNull();
  });

  it("allows a staffer whose role has platform:team:manage", async () => {
    const staffer = await createAdminSession();
    await grantPlatformPermission(staffer.userId, TEAM_MANAGE_PERMISSION_KEY);

    const response = await request(testApp)
      .post("/api/admin/invites")
      .set("Authorization", staffer.authHeader)
      .send(inviteBody);

    expect(response.status).toBe(201);
    const invite = await prisma.adminInvite.findFirst({ where: { email: inviteBody.email } });
    expect(invite?.invitedById).toBe(staffer.userId);
  });

  it("allows the platform SUPERADMIN even without an explicit platform:team:manage grant", async () => {
    const founder = await createAdminSession();
    await makePlatformSuperAdmin(founder.userId);

    const response = await request(testApp)
      .post("/api/admin/invites")
      .set("Authorization", founder.authHeader)
      .send(inviteBody);

    expect(response.status).toBe(201);
    const invite = await prisma.adminInvite.findFirst({ where: { email: inviteBody.email } });
    expect(invite?.invitedById).toBe(founder.userId);
  });
});
