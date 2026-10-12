import { randomUUID } from "node:crypto";

import { subHours } from "date-fns/subHours";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { UserRole } from "#generated/prisma/enums.js";
import { slugifyHandle } from "#lib/handle.utils.js";
import { generateOpaqueToken } from "#lib/opaque-token.utils.js";
import { hashPassword } from "#lib/password.utils.js";
import { BUILT_IN_ROLE_NAME } from "#modules/crm-access/crm-access.constants.js";
import { crmAccessRepository } from "#modules/crm-access/crm-access.repository.js";
import {
  createAdminInvite,
  createCrmInvite,
  createUserHoldingHandle,
  DEFAULT_TEST_PASSWORD,
  findPlatformRoleId,
} from "#test/integration/auth-fixtures.js";
import { seedPlatformOrganization } from "#test/integration/crm-fixtures.js";
import { testApp } from "#test/integration/test-app.js";
import { uniquePhone } from "#test/integration/unique-values.js";

describe("POST /api/auth/register/admin", () => {
  it("grants immediate platform access to a newly registered admin", async () => {
    await seedPlatformOrganization();
    const inviteToken = await createAdminInvite();

    const response = await request(testApp).post("/api/auth/register/admin").send({
      inviteToken,
      phone: uniquePhone(),
      password: DEFAULT_TEST_PASSWORD,
      confirmPassword: DEFAULT_TEST_PASSWORD,
    });

    expect(response.status).toBe(201);

    const { accessToken } = response.body.data;
    const platformResponse = await request(testApp)
      .get("/api/admin/financial-rollup")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(platformResponse.status).toBe(200);
  });

  it("enrolls the new admin onto the invite's chosen role, not a hardcoded default", async () => {
    await seedPlatformOrganization();
    const memberRoleId = await findPlatformRoleId(BUILT_IN_ROLE_NAME.MEMBER);
    const inviteToken = await createAdminInvite({ roleId: memberRoleId });

    const response = await request(testApp).post("/api/auth/register/admin").send({
      inviteToken,
      phone: uniquePhone(),
      password: DEFAULT_TEST_PASSWORD,
      confirmPassword: DEFAULT_TEST_PASSWORD,
    });

    expect(response.status).toBe(201);

    const platformOrganization = await crmAccessRepository.findPlatformOrganization();
    const membership = await prisma.membership.findUniqueOrThrow({
      where: {
        userId_organizationId: {
          userId: response.body.data.user.id,
          organizationId: platformOrganization!.id,
        },
      },
    });
    expect(membership.roleId).toBe(memberRoleId);

    const { accessToken } = response.body.data;
    const platformResponse = await request(testApp)
      .get("/api/admin/financial-rollup")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(platformResponse.status).toBe(403);
  });

  it("registers an admin whose name's handle is already taken by giving them a suffixed handle", async () => {
    await seedPlatformOrganization();
    const inviteeName = `Taken Handle ${randomUUID().slice(0, 6)}`;
    const takenHandle = slugifyHandle(inviteeName);
    await createUserHoldingHandle(takenHandle);
    const inviteToken = await createAdminInvite({ name: inviteeName });

    const response = await request(testApp).post("/api/auth/register/admin").send({
      inviteToken,
      phone: uniquePhone(),
      password: DEFAULT_TEST_PASSWORD,
      confirmPassword: DEFAULT_TEST_PASSWORD,
    });

    expect(response.status).toBe(201);

    const registeredUser = await prisma.user.findUniqueOrThrow({
      where: { id: response.body.data.user.id },
    });
    expect(registeredUser.handle).not.toBe(takenHandle);
    expect(registeredUser.handle.startsWith(takenHandle)).toBe(true);
  });
});

describe("GET /api/auth/invite/crm", () => {
  it("returns the org and role for a pending invite that needs registration", async () => {
    const { rawToken, invite, organization, memberRole } = await createCrmInvite();

    const response = await request(testApp).get("/api/auth/invite/crm").query({ token: rawToken });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      email: invite.email,
      organizationName: organization.name,
      roleName: memberRole.name,
      requiresRegistration: true,
    });
  });

  it("rejects an expired invite token", async () => {
    const { rawToken } = await createCrmInvite({ expiresAt: subHours(new Date(), 1) });

    const response = await request(testApp).get("/api/auth/invite/crm").query({ token: rawToken });

    expect(response.status).toBe(409);
  });

  it("rejects an unknown token", async () => {
    const response = await request(testApp)
      .get("/api/auth/invite/crm")
      .query({ token: generateOpaqueToken() });

    expect(response.status).toBe(404);
  });
});

describe("POST /api/auth/register/crm-invite", () => {
  it("creates a tenant-only admin account and grants CRM access without platform access", async () => {
    const { rawToken, invite, organization, memberRole } = await createCrmInvite();

    const response = await request(testApp).post("/api/auth/register/crm-invite").send({
      inviteToken: rawToken,
      name: "Sujata Rai",
      phone: uniquePhone(),
      password: DEFAULT_TEST_PASSWORD,
      confirmPassword: DEFAULT_TEST_PASSWORD,
    });

    expect(response.status).toBe(201);

    const { accessToken, user } = response.body.data;
    expect(user).toMatchObject({
      role: UserRole.TENANT_STAFF,
      hasPlatformAccess: false,
      hasCrmAccess: true,
    });

    const createdUser = await prisma.user.findUniqueOrThrow({ where: { email: invite.email } });
    expect(createdUser.emailVerified).toBe(true);

    const membership = await prisma.membership.findUniqueOrThrow({
      where: { userId_organizationId: { userId: createdUser.id, organizationId: organization.id } },
    });
    expect(membership).toMatchObject({ roleId: memberRole.id, status: "ACTIVE" });

    const consumedInvite = await prisma.organizationInvite.findUniqueOrThrow({
      where: { id: invite.id },
    });
    expect(consumedInvite.acceptedAt).not.toBeNull();

    const platformResponse = await request(testApp)
      .get("/api/admin/financial-rollup")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(platformResponse.status).toBe(403);
  });

  it("registers a CRM invitee whose name's handle is already taken by giving them a suffixed handle", async () => {
    const { rawToken, invite } = await createCrmInvite();
    const inviteeName = `Taken Handle ${randomUUID().slice(0, 6)}`;
    const takenHandle = slugifyHandle(inviteeName);
    await createUserHoldingHandle(takenHandle);

    const response = await request(testApp).post("/api/auth/register/crm-invite").send({
      inviteToken: rawToken,
      name: inviteeName,
      phone: uniquePhone(),
      password: DEFAULT_TEST_PASSWORD,
      confirmPassword: DEFAULT_TEST_PASSWORD,
    });

    expect(response.status).toBe(201);

    const registeredUser = await prisma.user.findUniqueOrThrow({ where: { email: invite.email } });
    expect(registeredUser.handle).not.toBe(takenHandle);
    expect(registeredUser.handle.startsWith(takenHandle)).toBe(true);
  });

  it("rejects a second registration with the same invite token", async () => {
    const { rawToken } = await createCrmInvite();

    const first = await request(testApp).post("/api/auth/register/crm-invite").send({
      inviteToken: rawToken,
      name: "First Taker",
      phone: uniquePhone(),
      password: DEFAULT_TEST_PASSWORD,
      confirmPassword: DEFAULT_TEST_PASSWORD,
    });
    expect(first.status).toBe(201);

    const second = await request(testApp).post("/api/auth/register/crm-invite").send({
      inviteToken: rawToken,
      name: "Second Taker",
      phone: uniquePhone(),
      password: DEFAULT_TEST_PASSWORD,
      confirmPassword: DEFAULT_TEST_PASSWORD,
    });
    expect(second.status).toBe(409);
  });

  it("rejects registration when the invite email already has an account", async () => {
    const { rawToken, invite } = await createCrmInvite();
    await prisma.user.create({
      data: {
        email: invite.email,
        name: "Already Here",
        handle: `already-here-${randomUUID().slice(0, 8)}`,
        phone: uniquePhone(),
        passwordHash: await hashPassword(DEFAULT_TEST_PASSWORD),
        emailVerified: true,
      },
    });

    const response = await request(testApp).post("/api/auth/register/crm-invite").send({
      inviteToken: rawToken,
      name: "Late Comer",
      phone: uniquePhone(),
      password: DEFAULT_TEST_PASSWORD,
      confirmPassword: DEFAULT_TEST_PASSWORD,
    });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("USER_EXISTS");
  });

  it("rejects registration when the phone number already belongs to another account", async () => {
    const { rawToken } = await createCrmInvite();
    const takenPhone = uniquePhone();
    await prisma.user.create({
      data: {
        email: `phone-owner-${randomUUID()}@outfiqe.test`,
        name: "Phone Owner",
        handle: `phone-owner-${randomUUID().slice(0, 8)}`,
        phone: takenPhone,
        passwordHash: await hashPassword(DEFAULT_TEST_PASSWORD),
        emailVerified: true,
      },
    });

    const response = await request(testApp).post("/api/auth/register/crm-invite").send({
      inviteToken: rawToken,
      name: "Phone Clash",
      phone: takenPhone,
      password: DEFAULT_TEST_PASSWORD,
      confirmPassword: DEFAULT_TEST_PASSWORD,
    });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("PHONE_EXISTS");
  });
});
