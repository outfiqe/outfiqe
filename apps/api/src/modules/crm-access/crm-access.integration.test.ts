import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { generateOpaqueToken, hashToken } from "#lib/opaque-token.utils.js";
import { testApp } from "#test/integration/testApp.js";

import {
  BUILT_IN_ROLE_NAME,
  BUILT_IN_ROLE_PERMISSIONS,
  PERMISSION_CATALOG,
} from "./crm-access.constants.js";

const uniquePhone = () => `98${randomUUID().replace(/\D/g, "1").slice(0, 8)}`;

const createStaffUser = async (name: string) => {
  const slug = name.toLowerCase().replace(/\s+/g, "-");
  return prisma.user.create({
    data: {
      email: `${slug}-${randomUUID()}@outfiqe.test`,
      name,
      handle: `${slug}-${randomUUID().slice(0, 8)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role: UserRole.ADMIN,
    },
  });
};

const createCustomerUser = async (name: string) => {
  const slug = name.toLowerCase().replace(/\s+/g, "-");
  return prisma.user.create({
    data: {
      email: `${slug}-${randomUUID()}@outfiqe.test`,
      name,
      handle: `${slug}-${randomUUID().slice(0, 8)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role: UserRole.CUSTOMER,
    },
  });
};

const authHeaderFor = (userId: string) => {
  const { accessToken } = generateTokenpair({ sub: userId, role: UserRole.ADMIN });
  return `Bearer ${accessToken}`;
};

const seedOrganization = async (overrides: { subdomain?: string } = {}) => {
  await prisma.permission.createMany({ data: PERMISSION_CATALOG, skipDuplicates: true });
  const organization = await prisma.organization.create({
    data: {
      name: `Test Org ${randomUUID()}`,
      subdomain: overrides.subdomain ?? `test-org-${randomUUID().slice(0, 8)}`,
      plan: "trial",
    },
  });

  const adminRole = await prisma.role.create({
    data: {
      organizationId: organization.id,
      name: BUILT_IN_ROLE_NAME.ADMIN,
      isBuiltIn: true,
      permissions: {
        create: BUILT_IN_ROLE_PERMISSIONS[BUILT_IN_ROLE_NAME.ADMIN].map((permissionKey) => ({
          permissionKey,
        })),
      },
    },
  });
  const memberRole = await prisma.role.create({
    data: {
      organizationId: organization.id,
      name: BUILT_IN_ROLE_NAME.MEMBER,
      isBuiltIn: true,
      permissions: {
        create: BUILT_IN_ROLE_PERMISSIONS[BUILT_IN_ROLE_NAME.MEMBER].map((permissionKey) => ({
          permissionKey,
        })),
      },
    },
  });

  return { organization, adminRole, memberRole };
};

const addMembership = async (
  organizationId: string,
  userId: string,
  roleId: string,
  status: "ACTIVE" | "DEACTIVATED" = "ACTIVE",
) => prisma.membership.create({ data: { organizationId, userId, roleId, status } });

const makeSuperAdmin = async (organizationId: string, membershipId: string) =>
  prisma.organization.update({
    where: { id: organizationId },
    data: { superAdminMembershipId: membershipId },
  });

describe("GET /api/crm/organization", () => {
  it("rejects a staff account with no CRM membership", async () => {
    await seedOrganization();
    const staff = await createStaffUser("No Membership");

    const response = await request(testApp)
      .get("/api/crm/organization")
      .set("Authorization", authHeaderFor(staff.id));

    expect(response.status).toBe(403);
  });

  it("allows the SUPERADMIN", async () => {
    const { organization, adminRole } = await seedOrganization();
    const staff = await createStaffUser("Super Admin");
    const membership = await addMembership(organization.id, staff.id, adminRole.id);
    await makeSuperAdmin(organization.id, membership.id);

    const response = await request(testApp)
      .get("/api/crm/organization")
      .set("Authorization", authHeaderFor(staff.id));

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(organization.id);
  });

  it("allows a Member-role holder, since org:read is in the Member permission set", async () => {
    const { organization, memberRole } = await seedOrganization();
    const staff = await createStaffUser("Regular Member");
    await addMembership(organization.id, staff.id, memberRole.id);

    const response = await request(testApp)
      .get("/api/crm/organization")
      .set("Authorization", authHeaderFor(staff.id));

    expect(response.status).toBe(200);
  });

  it("rejects a deactivated membership", async () => {
    const { organization, memberRole } = await seedOrganization();
    const staff = await createStaffUser("Deactivated Member");
    await addMembership(organization.id, staff.id, memberRole.id, "DEACTIVATED");

    const response = await request(testApp)
      .get("/api/crm/organization")
      .set("Authorization", authHeaderFor(staff.id));

    expect(response.status).toBe(403);
  });
});

describe("Tenant resolution via subdomain", () => {
  it("resolves the organization from a subdomain Host header", async () => {
    const { organization, adminRole } = await seedOrganization({ subdomain: "acme-corp" });
    const staff = await createStaffUser("Acme Owner");
    const membership = await addMembership(organization.id, staff.id, adminRole.id);
    await makeSuperAdmin(organization.id, membership.id);

    const response = await request(testApp)
      .get("/api/crm/organization")
      .set("Host", "acme-corp.localhost")
      .set("Authorization", authHeaderFor(staff.id));

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(organization.id);
  });

  it("does not leak a different organization's data across subdomains", async () => {
    const orgA = await seedOrganization({ subdomain: "org-a" });
    const orgB = await seedOrganization({ subdomain: "org-b" });

    const staffA = await createStaffUser("Org A Owner");
    const membershipA = await addMembership(orgA.organization.id, staffA.id, orgA.adminRole.id);
    await makeSuperAdmin(orgA.organization.id, membershipA.id);

    const response = await request(testApp)
      .get("/api/crm/organization")
      .set("Host", "org-b.localhost")
      .set("Authorization", authHeaderFor(staffA.id));

    expect(response.status).toBe(403);
    expect(response.body.data?.id).not.toBe(orgB.organization.id);
  });

  it("returns 404 for a well-formed but unknown subdomain", async () => {
    await seedOrganization();
    const staff = await createStaffUser("Random Visitor");

    const response = await request(testApp)
      .get("/api/crm/organization")
      .set("Host", "no-such-org.localhost")
      .set("Authorization", authHeaderFor(staff.id));

    expect(response.status).toBe(404);
    expect(response.body.code).toBe("ORGANIZATION_NOT_FOUND");
  });

  it("falls back to the single seeded organization when no subdomain is present", async () => {
    const { organization, adminRole } = await seedOrganization();
    const staff = await createStaffUser("Default Org User");
    const membership = await addMembership(organization.id, staff.id, adminRole.id);
    await makeSuperAdmin(organization.id, membership.id);

    const response = await request(testApp)
      .get("/api/crm/organization")
      .set("Authorization", authHeaderFor(staff.id));

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(organization.id);
  });
});

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

    const acceptResponse = await request(testApp)
      .post("/api/crm/invites/accept")
      .set("Authorization", authHeaderFor(invitee.id))
      .send({ token: rawToken });

    expect(acceptResponse.status).toBe(201);

    const membership = await prisma.membership.findUniqueOrThrow({
      where: { userId_organizationId: { userId: invitee.id, organizationId: organization.id } },
    });
    expect(membership.roleId).toBe(memberRole.id);
    expect(membership.status).toBe("ACTIVE");
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
      .set("Authorization", authHeaderFor(superAdminUser.id))
      .send({ email: shopper.email, roleId: memberRole.id });

    expect(response.status).toBe(404);
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
