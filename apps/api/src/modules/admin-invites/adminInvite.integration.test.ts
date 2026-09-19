import { addDays } from "date-fns/addDays";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { hashToken } from "#lib/opaque-token.utils.js";
import { BUILT_IN_ROLE_NAME } from "#modules/crm-access/crm-access.constants.js";
import { crmAccessRepository } from "#modules/crm-access/crm-access.repository.js";
import { PLATFORM_PERMISSION_CATALOG } from "#modules/platform-access/platform-access.constants.js";
import { createAdminSession } from "#test/integration/authHelpers.js";
import { testApp } from "#test/integration/testApp.js";

const TEAM_MANAGE_PERMISSION_KEY = "platform:team:manage";

const findPlatformRoleId = async (roleName: string): Promise<string> => {
  const platformOrganization = await crmAccessRepository.findPlatformOrganization();
  if (!platformOrganization) throw new Error("platform organization missing in fixture");
  const role = await prisma.role.findFirstOrThrow({
    where: { organizationId: platformOrganization.id, name: roleName },
  });
  return role.id;
};

const seedInvite = async (email: string, invitedById: string, roleId?: string) => {
  const resolvedRoleId = roleId ?? (await findPlatformRoleId(BUILT_IN_ROLE_NAME.ADMIN));
  await prisma.adminInvite.create({
    data: {
      email,
      name: email.split("@")[0]!,
      roleId: resolvedRoleId,
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

const makeCoFounder = async (userId: string) => {
  const membership = await findPlatformStaffMembership(userId);
  await prisma.membership.update({
    where: { id: membership.id },
    data: { isPlatformSuperAdmin: true },
  });
};

describe("GET /api/admin/invites", () => {
  it("flags the row whose email belongs to an active platform co-founder", async () => {
    const requester = await createAdminSession();
    const coFounder = await createAdminSession();
    await makeCoFounder(coFounder.userId);

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

  it("includes the role id and name granted by each invite", async () => {
    const requester = await createAdminSession();
    const memberRoleId = await findPlatformRoleId(BUILT_IN_ROLE_NAME.MEMBER);
    await seedInvite("member-invite@outfiqe.test", requester.userId, memberRoleId);

    const response = await request(testApp)
      .get("/api/admin/invites")
      .set("Authorization", requester.authHeader)
      .expect(200);

    const {
      invites: summaries,
    }: { invites: { email: string; roleId: string; roleName: string }[] } = response.body.data;
    const invite = summaries.find((summary) => summary.email === "member-invite@outfiqe.test");
    expect(invite?.roleId).toBe(memberRoleId);
    expect(invite?.roleName).toBe(BUILT_IN_ROLE_NAME.MEMBER);
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
  const inviteBody = async () => ({
    email: "new-admin@outfiqe.test",
    name: "New Admin",
    roleId: await findPlatformRoleId(BUILT_IN_ROLE_NAME.ADMIN),
  });

  it("blocks a plain platform staffer", async () => {
    const staffer = await createAdminSession();

    const response = await request(testApp)
      .post("/api/admin/invites")
      .set("Authorization", staffer.authHeader)
      .send(await inviteBody());

    expect(response.status).toBe(403);
    const invite = await prisma.adminInvite.findFirst({
      where: { email: "new-admin@outfiqe.test" },
    });
    expect(invite).toBeNull();
  });

  it("blocks a staffer holding platform:team:manage who isn't a co-founder", async () => {
    const staffer = await createAdminSession();
    await grantPlatformPermission(staffer.userId, TEAM_MANAGE_PERMISSION_KEY);

    const response = await request(testApp)
      .post("/api/admin/invites")
      .set("Authorization", staffer.authHeader)
      .send(await inviteBody());

    expect(response.status).toBe(403);
    const invite = await prisma.adminInvite.findFirst({
      where: { email: "new-admin@outfiqe.test" },
    });
    expect(invite).toBeNull();
  });

  it("allows a co-founder", async () => {
    const founder = await createAdminSession();
    await makeCoFounder(founder.userId);

    const response = await request(testApp)
      .post("/api/admin/invites")
      .set("Authorization", founder.authHeader)
      .send(await inviteBody());

    expect(response.status).toBe(201);
    const invite = await prisma.adminInvite.findFirst({
      where: { email: "new-admin@outfiqe.test" },
    });
    expect(invite?.invitedById).toBe(founder.userId);
  });

  it("persists the invite's chosen role", async () => {
    const founder = await createAdminSession();
    await makeCoFounder(founder.userId);
    const memberRoleId = await findPlatformRoleId(BUILT_IN_ROLE_NAME.MEMBER);

    const response = await request(testApp)
      .post("/api/admin/invites")
      .set("Authorization", founder.authHeader)
      .send({ email: "member-invite@outfiqe.test", name: "New Member", roleId: memberRoleId });

    expect(response.status).toBe(201);
    const invite = await prisma.adminInvite.findFirst({
      where: { email: "member-invite@outfiqe.test" },
    });
    expect(invite?.roleId).toBe(memberRoleId);
  });

  it("rejects a roleId that doesn't belong to the platform org", async () => {
    const founder = await createAdminSession();
    await makeCoFounder(founder.userId);

    const response = await request(testApp)
      .post("/api/admin/invites")
      .set("Authorization", founder.authHeader)
      .send({
        email: "bogus-role@outfiqe.test",
        name: "Bogus Role",
        roleId: "00000000-0000-0000-0000-000000000000",
      });

    expect(response.status).toBe(404);
    expect(response.body.code).toBe("ROLE_NOT_FOUND");
  });

  it("rejects a missing roleId", async () => {
    const founder = await createAdminSession();
    await makeCoFounder(founder.userId);

    const response = await request(testApp)
      .post("/api/admin/invites")
      .set("Authorization", founder.authHeader)
      .send({ email: "no-role@outfiqe.test", name: "No Role" });

    expect(response.status).toBe(422);
  });

  it("refuses to re-invite an email that already belongs to an admin account", async () => {
    const founder = await createAdminSession();
    await makeCoFounder(founder.userId);
    const alreadyAdmin = await createAdminSession();
    const alreadyAdminUser = await prisma.user.findUniqueOrThrow({
      where: { id: alreadyAdmin.userId },
      select: { email: true },
    });

    const response = await request(testApp)
      .post("/api/admin/invites")
      .set("Authorization", founder.authHeader)
      .send({
        email: alreadyAdminUser.email,
        name: "Duplicate Invite",
        roleId: await findPlatformRoleId(BUILT_IN_ROLE_NAME.ADMIN),
      });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("USER_EXISTS");
    const invites = await prisma.adminInvite.findMany({ where: { email: alreadyAdminUser.email } });
    expect(invites).toHaveLength(0);
  });

  it("refuses a second invite to an email that already has a pending, unaccepted invite", async () => {
    const founder = await createAdminSession();
    await makeCoFounder(founder.userId);
    const roleId = await findPlatformRoleId(BUILT_IN_ROLE_NAME.ADMIN);

    const first = await request(testApp)
      .post("/api/admin/invites")
      .set("Authorization", founder.authHeader)
      .send({ email: "twice-invited@outfiqe.test", name: "Twice Invited", roleId });
    expect(first.status).toBe(201);

    const second = await request(testApp)
      .post("/api/admin/invites")
      .set("Authorization", founder.authHeader)
      .send({ email: "twice-invited@outfiqe.test", name: "Twice Invited", roleId });

    expect(second.status).toBe(409);
    expect(second.body.code).toBe("INVITE_ALREADY_PENDING");
    const invites = await prisma.adminInvite.findMany({
      where: { email: "twice-invited@outfiqe.test" },
    });
    expect(invites).toHaveLength(1);
  });

  it("allows re-inviting an email once its earlier invite has expired", async () => {
    const founder = await createAdminSession();
    await makeCoFounder(founder.userId);
    const roleId = await findPlatformRoleId(BUILT_IN_ROLE_NAME.ADMIN);
    await seedInvite("expired-invite@outfiqe.test", founder.userId, roleId);
    await prisma.adminInvite.updateMany({
      where: { email: "expired-invite@outfiqe.test" },
      data: { expiresAt: addDays(new Date(), -1) },
    });

    const response = await request(testApp)
      .post("/api/admin/invites")
      .set("Authorization", founder.authHeader)
      .send({ email: "expired-invite@outfiqe.test", name: "Expired Invite", roleId });

    expect(response.status).toBe(201);
    const invites = await prisma.adminInvite.findMany({
      where: { email: "expired-invite@outfiqe.test" },
    });
    expect(invites).toHaveLength(2);
  });

  it("refuses to invite an email that already belongs to a co-founder account", async () => {
    const founder = await createAdminSession();
    await makeCoFounder(founder.userId);
    const otherCoFounder = await createAdminSession();
    await makeCoFounder(otherCoFounder.userId);
    const coFounderUser = await prisma.user.findUniqueOrThrow({
      where: { id: otherCoFounder.userId },
      select: { email: true },
    });

    const response = await request(testApp)
      .post("/api/admin/invites")
      .set("Authorization", founder.authHeader)
      .send({
        email: coFounderUser.email,
        name: "Duplicate Co-founder Invite",
        roleId: await findPlatformRoleId(BUILT_IN_ROLE_NAME.ADMIN),
      });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("USER_EXISTS");
    const invites = await prisma.adminInvite.findMany({ where: { email: coFounderUser.email } });
    expect(invites).toHaveLength(0);
  });
});
