import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { prisma } from "#db/prisma.js";
import { eventBus } from "#events/event-bus.js";
import { generateOpaqueToken, hashToken } from "#lib/opaque-token.utils.js";
import { isUniqueConstraintError } from "#lib/prisma.utils.js";
import {
  addMembership,
  authHeaderFor,
  createCustomerUser,
  createStaffUser,
  createTenantStaffUser,
  makeSuperAdmin,
  seedOrganization,
} from "#test/integration/crm-access-fixtures.js";
import { testApp } from "#test/integration/test-app.js";

import { crmAccessRepository } from "../crm-access.repository.js";

describe("CRM invites", () => {
  it("invites an existing staff account and lets them accept it", async () => {
    const { organization, adminRole, memberRole } = await seedOrganization();
    const superAdminUser = await createStaffUser("Inviter");
    const superAdminMembership = await addMembership(
      organization.id,
      superAdminUser.id,
      adminRole.id,
    );
    await makeSuperAdmin(organization.id, superAdminMembership.id);

    const invitee = await createStaffUser("Invitee");

    const inviteResponse = await request(testApp)
      .post("/api/crm/invites")
      .set("Host", `${organization.subdomain}.localhost`)
      .set("Authorization", authHeaderFor(superAdminUser.id))
      .send({ email: invitee.email, roleId: memberRole.id });

    expect(inviteResponse.status).toBe(201);

    const storedInvite = await prisma.organizationInvite.findFirstOrThrow({
      where: { organizationId: organization.id, email: invitee.email },
    });
    expect(storedInvite.roleId).toBe(memberRole.id);

    const rawToken = generateOpaqueToken();
    await prisma.organizationInvite.update({
      where: { id: storedInvite.id },
      data: { tokenHash: hashToken(rawToken) },
    });

    const publishSpy = vi.spyOn(eventBus, "publish").mockResolvedValue(undefined);
    const acceptResponse = await request(testApp)
      .post("/api/crm/invites/accept")
      .set("Host", `${organization.subdomain}.localhost`)
      .set("Authorization", authHeaderFor(invitee.id))
      .send({ token: rawToken });

    expect(acceptResponse.status).toBe(201);

    const membership = await prisma.membership.findUniqueOrThrow({
      where: { userId_organizationId: { userId: invitee.id, organizationId: organization.id } },
    });
    expect(membership.roleId).toBe(memberRole.id);
    expect(membership.status).toBe("ACTIVE");
    expect(publishSpy).toHaveBeenCalledWith("crm.member.joined", {
      organizationId: organization.id,
      membershipId: membership.id,
      userId: invitee.id,
    });
    publishSpy.mockRestore();
  });

  it("rejects calling acceptInvite again for a membership it already granted", async () => {
    const { organization, memberRole } = await seedOrganization();
    const invitee = await createStaffUser("Retried Acceptor");
    const rawToken = generateOpaqueToken();
    const invite = await prisma.organizationInvite.create({
      data: {
        organizationId: organization.id,
        email: invitee.email,
        roleId: memberRole.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        invitedById: invitee.id,
      },
    });

    await crmAccessRepository.acceptInvite(invite, invitee.id);

    await expect(crmAccessRepository.acceptInvite(invite, invitee.id)).rejects.toSatisfy(
      isUniqueConstraintError,
    );
    expect(
      await prisma.membership.count({
        where: { userId: invitee.id, organizationId: organization.id },
      }),
    ).toBe(1);
  });

  it("rejects an already-accepted invite token", async () => {
    const { organization, memberRole } = await seedOrganization();
    const invitee = await createStaffUser("Repeat Acceptor");
    const rawToken = generateOpaqueToken();

    await prisma.organizationInvite.create({
      data: {
        organizationId: organization.id,
        email: invitee.email,
        roleId: memberRole.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        acceptedAt: new Date(),
        invitedById: invitee.id,
      },
    });

    const response = await request(testApp)
      .post("/api/crm/invites/accept")
      .set("Host", `${organization.subdomain}.localhost`)
      .set("Authorization", authHeaderFor(invitee.id))
      .send({ token: rawToken });

    expect(response.status).toBe(409);
  });

  it("rejects an expired invite token", async () => {
    const { organization, memberRole } = await seedOrganization();
    const invitee = await createStaffUser("Late Acceptor");
    const rawToken = generateOpaqueToken();

    await prisma.organizationInvite.create({
      data: {
        organizationId: organization.id,
        email: invitee.email,
        roleId: memberRole.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() - 1000),
        invitedById: invitee.id,
      },
    });

    const response = await request(testApp)
      .post("/api/crm/invites/accept")
      .set("Host", `${organization.subdomain}.localhost`)
      .set("Authorization", authHeaderFor(invitee.id))
      .send({ token: rawToken });

    expect(response.status).toBe(409);
  });

  it("rejects a token whose invite was addressed to a different email", async () => {
    const { organization, memberRole } = await seedOrganization();
    const inviter = await createStaffUser("Inviter Two");
    const rawToken = generateOpaqueToken();

    await prisma.organizationInvite.create({
      data: {
        organizationId: organization.id,
        email: `someone-else-${randomUUID()}@outfiqe.test`,
        roleId: memberRole.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        invitedById: inviter.id,
      },
    });

    const wrongAccepter = await createStaffUser("Wrong Accepter");

    const response = await request(testApp)
      .post("/api/crm/invites/accept")
      .set("Host", `${organization.subdomain}.localhost`)
      .set("Authorization", authHeaderFor(wrongAccepter.id))
      .send({ token: rawToken });

    expect(response.status).toBe(403);
  });

  it("rejects inviting someone who already has CRM access", async () => {
    const { organization, adminRole, memberRole } = await seedOrganization();
    const superAdminUser = await createStaffUser("Inviter Three");
    const superAdminMembership = await addMembership(
      organization.id,
      superAdminUser.id,
      adminRole.id,
    );
    await makeSuperAdmin(organization.id, superAdminMembership.id);

    const existingMember = await createStaffUser("Already A Member");
    await addMembership(organization.id, existingMember.id, memberRole.id);

    const response = await request(testApp)
      .post("/api/crm/invites")
      .set("Host", `${organization.subdomain}.localhost`)
      .set("Authorization", authHeaderFor(superAdminUser.id))
      .send({ email: existingMember.email, roleId: memberRole.id });

    expect(response.status).toBe(409);
  });

  it("rejects inviting an existing account that isn't a staff account", async () => {
    const { organization, adminRole, memberRole } = await seedOrganization();
    const superAdminUser = await createStaffUser("Inviter Four");
    const superAdminMembership = await addMembership(
      organization.id,
      superAdminUser.id,
      adminRole.id,
    );
    await makeSuperAdmin(organization.id, superAdminMembership.id);

    const shopper = await createCustomerUser("Just A Shopper");

    const response = await request(testApp)
      .post("/api/crm/invites")
      .set("Host", `${organization.subdomain}.localhost`)
      .set("Authorization", authHeaderFor(superAdminUser.id))
      .send({ email: shopper.email, roleId: memberRole.id });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("EMAIL_IN_USE");
  });

  it("creates a pending invite for an existing tenant staff account from another organization", async () => {
    const { organization, adminRole, memberRole } = await seedOrganization();
    const superAdminUser = await createStaffUser("Inviter Tenant Staff");
    const superAdminMembership = await addMembership(
      organization.id,
      superAdminUser.id,
      adminRole.id,
    );
    await makeSuperAdmin(organization.id, superAdminMembership.id);

    const existingTenantStaff = await createTenantStaffUser("Existing Tenant Staff");

    const response = await request(testApp)
      .post("/api/crm/invites")
      .set("Host", `${organization.subdomain}.localhost`)
      .set("Authorization", authHeaderFor(superAdminUser.id))
      .send({ email: existingTenantStaff.email, roleId: memberRole.id });

    expect(response.status).toBe(201);
  });

  it("creates a pending invite for an email with no Outfiqe account yet", async () => {
    const { organization, adminRole, memberRole } = await seedOrganization();
    const superAdminUser = await createStaffUser("Inviter Five");
    const superAdminMembership = await addMembership(
      organization.id,
      superAdminUser.id,
      adminRole.id,
    );
    await makeSuperAdmin(organization.id, superAdminMembership.id);

    const strangerEmail = `stranger-${randomUUID()}@outfiqe.test`;

    const response = await request(testApp)
      .post("/api/crm/invites")
      .set("Host", `${organization.subdomain}.localhost`)
      .set("Authorization", authHeaderFor(superAdminUser.id))
      .send({ email: strangerEmail, roleId: memberRole.id });

    expect(response.status).toBe(201);

    const storedInvite = await prisma.organizationInvite.findFirstOrThrow({
      where: { organizationId: organization.id, email: strangerEmail },
    });
    expect(storedInvite.roleId).toBe(memberRole.id);
    expect(storedInvite.acceptedAt).toBeNull();

    const strangerUser = await prisma.user.findUnique({ where: { email: strangerEmail } });
    expect(strangerUser).toBeNull();
  });

  it("enforces the subscription's seat limit when inviting a new member", async () => {
    const { organization, adminRole, memberRole } = await seedOrganization();
    const superAdminUser = await createStaffUser("Seat Limit Inviter");
    const superAdminMembership = await addMembership(
      organization.id,
      superAdminUser.id,
      adminRole.id,
    );
    await makeSuperAdmin(organization.id, superAdminMembership.id);

    await prisma.subscription.create({
      data: {
        organizationId: organization.id,
        plan: "starter",
        seats: 1,
        status: "ACTIVE",
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    const response = await request(testApp)
      .post("/api/crm/invites")
      .set("Host", `${organization.subdomain}.localhost`)
      .set("Authorization", authHeaderFor(superAdminUser.id))
      .send({ email: `over-seat-${randomUUID()}@outfiqe.test`, roleId: memberRole.id });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("SEAT_LIMIT_REACHED");
    expect(
      await prisma.organizationInvite.count({ where: { organizationId: organization.id } }),
    ).toBe(0);
  });

  it("does not enforce a seat limit while the organization has no subscription yet", async () => {
    const { organization, adminRole, memberRole } = await seedOrganization();
    const superAdminUser = await createStaffUser("Trial Inviter");
    const superAdminMembership = await addMembership(
      organization.id,
      superAdminUser.id,
      adminRole.id,
    );
    await makeSuperAdmin(organization.id, superAdminMembership.id);

    const response = await request(testApp)
      .post("/api/crm/invites")
      .set("Host", `${organization.subdomain}.localhost`)
      .set("Authorization", authHeaderFor(superAdminUser.id))
      .send({ email: `trial-invite-${randomUUID()}@outfiqe.test`, roleId: memberRole.id });

    expect(response.status).toBe(201);
  });

  it("never oversells seats under two concurrent invite requests at the limit", async () => {
    const { organization, adminRole, memberRole } = await seedOrganization();
    const superAdminUser = await createStaffUser("Concurrent Seat Inviter");
    const superAdminMembership = await addMembership(
      organization.id,
      superAdminUser.id,
      adminRole.id,
    );
    await makeSuperAdmin(organization.id, superAdminMembership.id);

    await prisma.subscription.create({
      data: {
        organizationId: organization.id,
        plan: "starter",
        seats: 2,
        status: "ACTIVE",
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    const inviteOnce = () =>
      request(testApp)
        .post("/api/crm/invites")
        .set("Host", `${organization.subdomain}.localhost`)
        .set("Authorization", authHeaderFor(superAdminUser.id))
        .send({ email: `concurrent-seat-${randomUUID()}@outfiqe.test`, roleId: memberRole.id });

    const [first, second] = await Promise.all([inviteOnce(), inviteOnce()]);
    const statuses = [first.status, second.status].sort();

    expect(statuses).toEqual([201, 409]);
    const rejected = first.status === 409 ? first : second;
    expect(rejected.body.code).toBe("SEAT_LIMIT_REACHED");

    const pendingInvites = await prisma.organizationInvite.count({
      where: { organizationId: organization.id, acceptedAt: null, revokedAt: null },
    });
    expect(pendingInvites).toBe(1);
  });

  it("resolves two concurrent accepts of the same invite cleanly, without a raw server error", async () => {
    const { organization, memberRole } = await seedOrganization();
    const invitee = await createStaffUser("Concurrent Acceptor");
    const rawToken = generateOpaqueToken();

    await prisma.organizationInvite.create({
      data: {
        organizationId: organization.id,
        email: invitee.email,
        roleId: memberRole.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        invitedById: invitee.id,
      },
    });

    const acceptOnce = () =>
      request(testApp)
        .post("/api/crm/invites/accept")
        .set("Host", `${organization.subdomain}.localhost`)
        .set("Authorization", authHeaderFor(invitee.id))
        .send({ token: rawToken });

    const [first, second] = await Promise.all([acceptOnce(), acceptOnce()]);
    const statuses = [first.status, second.status].sort();

    expect(statuses).toEqual([201, 409]);
    const failed = first.status === 409 ? first : second;
    expect(["INVITE_INVALID", "MEMBER_EXISTS"]).toContain(failed.body.code);

    const memberships = await prisma.membership.findMany({
      where: { userId: invitee.id, organizationId: organization.id },
    });
    expect(memberships).toHaveLength(1);
  });
});
