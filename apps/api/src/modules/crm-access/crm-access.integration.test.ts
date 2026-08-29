import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { BrandRole, UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { generateOpaqueToken, hashToken } from "#lib/opaque-token.utils.js";
import { crmAccessService } from "#modules/crm-access/crm-access.service.js";
import {
  ensurePlatformOrganizationExists,
  seedPlatformOrganization,
} from "#test/integration/crmFixtures.js";
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

const createPlatformStaffUser = async (name: string) => {
  const staff = await createStaffUser(name);
  await ensurePlatformOrganizationExists();
  await crmAccessService.grantPlatformStaffMembership(staff.id);
  return staff;
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

const createBrand = (name: string) =>
  prisma.brand.create({
    data: {
      name,
      contactName: "Brand Contact",
      email: `${randomUUID()}@brand.outfiqe.test`,
      phone: uniquePhone(),
      instagram: `@${randomUUID().slice(0, 8)}`,
    },
  });

const createBrandOwner = async (brandId: string) => {
  const owner = await prisma.user.create({
    data: {
      email: `brand-owner-${randomUUID()}@outfiqe.test`,
      name: "Brand Owner",
      handle: `brand-owner-${randomUUID().slice(0, 8)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role: UserRole.BRAND_OWNER,
    },
  });
  await prisma.brandMembership.create({
    data: { userId: owner.id, brandId, role: BrandRole.OWNER },
  });
  return owner;
};

describe("POST /api/crm/organizations", () => {
  it("creates an organization and makes the caller its SUPERADMIN", async () => {
    await prisma.permission.createMany({ data: PERMISSION_CATALOG, skipDuplicates: true });
    const creator = await createPlatformStaffUser("Org Creator");

    const response = await request(testApp)
      .post("/api/crm/organizations")
      .set("Authorization", authHeaderFor(creator.id))
      .send({ name: "Acme", subdomain: `acme-${randomUUID().slice(0, 8)}` });

    expect(response.status).toBe(201);

    const organization = await prisma.organization.findUniqueOrThrow({
      where: { id: response.body.data.id },
    });
    const membership = await prisma.membership.findUniqueOrThrow({
      where: { userId_organizationId: { userId: creator.id, organizationId: organization.id } },
      include: { role: true },
    });

    expect(organization.superAdminMembershipId).toBe(membership.id);
    expect(membership.role.name).toBe(BUILT_IN_ROLE_NAME.ADMIN);

    const roles = await prisma.role.findMany({ where: { organizationId: organization.id } });
    expect(roles.map((role) => role.name).sort()).toEqual(
      [BUILT_IN_ROLE_NAME.ADMIN, BUILT_IN_ROLE_NAME.MEMBER].sort(),
    );
  });

  it("rejects a reserved subdomain", async () => {
    await prisma.permission.createMany({ data: PERMISSION_CATALOG, skipDuplicates: true });
    const creator = await createPlatformStaffUser("Reserved Subdomain Creator");

    const response = await request(testApp)
      .post("/api/crm/organizations")
      .set("Authorization", authHeaderFor(creator.id))
      .send({ name: "Impostor", subdomain: "www" });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("SUBDOMAIN_RESERVED");
  });

  it("rejects a subdomain that's already taken", async () => {
    const { organization: existing } = await seedOrganization();
    const creator = await createPlatformStaffUser("Duplicate Subdomain Creator");

    const response = await request(testApp)
      .post("/api/crm/organizations")
      .set("Authorization", authHeaderFor(creator.id))
      .send({ name: "Copycat", subdomain: existing.subdomain });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("SUBDOMAIN_TAKEN");
  });

  it("rejects a malformed subdomain", async () => {
    const creator = await createPlatformStaffUser("Malformed Subdomain Creator");

    const response = await request(testApp)
      .post("/api/crm/organizations")
      .set("Authorization", authHeaderFor(creator.id))
      .send({ name: "Bad Subdomain Co", subdomain: "-not-valid-" });

    expect(response.status).toBe(422);
  });

  it("requires a platform ADMIN account", async () => {
    const shopper = await createCustomerUser("Not An Admin");
    const { accessToken } = generateTokenpair({ sub: shopper.id, role: UserRole.CUSTOMER });

    const response = await request(testApp)
      .post("/api/crm/organizations")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Shouldn't Work", subdomain: `nope-${randomUUID().slice(0, 8)}` });

    expect(response.status).toBe(403);
  });

  it("hands off ownership to the target owner instead of the creating staff member", async () => {
    const staff = await createPlatformStaffUser("Concierge Onboarder");
    const brand = await createBrand("Kastha Apparel");
    const owner = await createBrandOwner(brand.id);
    const subdomain = `kastha-${randomUUID().slice(0, 8)}`;

    const createResponse = await request(testApp)
      .post("/api/crm/organizations")
      .set("Authorization", authHeaderFor(staff.id))
      .send({ name: brand.name, subdomain, targetOwnerUserId: owner.id });
    expect(createResponse.status).toBe(201);

    const organizationId = createResponse.body.data.id as string;

    const staffMembership = await prisma.membership.findUniqueOrThrow({
      where: { userId_organizationId: { userId: staff.id, organizationId } },
    });
    const ownerMembership = await prisma.membership.findUniqueOrThrow({
      where: { userId_organizationId: { userId: owner.id, organizationId } },
      include: { role: true },
    });
    expect(ownerMembership.role.name).toBe(BUILT_IN_ROLE_NAME.ADMIN);

    const organizationBeforeAccept = await prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
    });
    expect(organizationBeforeAccept.superAdminMembershipId).toBe(staffMembership.id);

    const pendingTransfer = await prisma.ownershipTransferRequest.findFirstOrThrow({
      where: { organizationId },
    });
    expect(pendingTransfer.toMembershipId).toBe(ownerMembership.id);
    expect(pendingTransfer.removeSenderMembershipOnAccept).toBe(true);

    const acceptResponse = await request(testApp)
      .post(`/api/crm/ownership-transfer/${pendingTransfer.id}/accept`)
      .set("Host", `${subdomain}.localhost`)
      .set("Authorization", authHeaderFor(owner.id));
    expect(acceptResponse.status).toBe(200);

    const organizationAfterAccept = await prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
    });
    expect(organizationAfterAccept.superAdminMembershipId).toBe(ownerMembership.id);

    const remainingStaffMembership = await prisma.membership.findUnique({
      where: { id: staffMembership.id },
    });
    expect(remainingStaffMembership).toBeNull();
  });
});

describe("GET /api/crm/organizations/suggest", () => {
  it("suggests a subdomain and resolves the owning user for a brand", async () => {
    const staff = await createPlatformStaffUser("Suggestion Requester");
    const brand = await createBrand("Everest Threads");
    const owner = await createBrandOwner(brand.id);

    const response = await request(testApp)
      .get("/api/crm/organizations/suggest")
      .query({ brandId: brand.id })
      .set("Authorization", authHeaderFor(staff.id));

    expect(response.status).toBe(200);
    expect(response.body.data.ownerUserId).toBe(owner.id);
    expect(response.body.data.brandName).toBe("Everest Threads");
    expect(response.body.data.suggestedSubdomain).toMatch(/^[a-z0-9-]+$/);
    expect(response.body.data.ownerExistingOrganizations).toEqual([]);
  });

  it("lists the owner's existing organizations instead of hiding them", async () => {
    const staff = await createPlatformStaffUser("Suggestion Requester Two");
    const brand = await createBrand("Solu Textiles");
    const owner = await createBrandOwner(brand.id);
    const { organization: existingOrg, adminRole } = await seedOrganization();
    const existingMembership = await addMembership(existingOrg.id, owner.id, adminRole.id);
    await makeSuperAdmin(existingOrg.id, existingMembership.id);

    const response = await request(testApp)
      .get("/api/crm/organizations/suggest")
      .query({ brandId: brand.id })
      .set("Authorization", authHeaderFor(staff.id));

    expect(response.status).toBe(200);
    expect(response.body.data.ownerExistingOrganizations).toEqual([
      { id: existingOrg.id, name: existingOrg.name },
    ]);
  });

  it("404s for a brand that doesn't exist", async () => {
    const staff = await createPlatformStaffUser("Suggestion Requester Three");

    const response = await request(testApp)
      .get("/api/crm/organizations/suggest")
      .query({ brandId: randomUUID() })
      .set("Authorization", authHeaderFor(staff.id));

    expect(response.status).toBe(404);
    expect(response.body.code).toBe("BRAND_NOT_FOUND");
  });

  it("rejects a brand with no owner membership", async () => {
    const staff = await createPlatformStaffUser("Suggestion Requester Four");
    const brand = await createBrand("Ownerless Co");

    const response = await request(testApp)
      .get("/api/crm/organizations/suggest")
      .query({ brandId: brand.id })
      .set("Authorization", authHeaderFor(staff.id));

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("BRAND_HAS_NO_OWNER");
  });

  it("requires a platform ADMIN account", async () => {
    const brand = await createBrand("Restricted Co");
    const shopper = await createCustomerUser("Not An Admin Either");
    const { accessToken } = generateTokenpair({ sub: shopper.id, role: UserRole.CUSTOMER });

    const response = await request(testApp)
      .get("/api/crm/organizations/suggest")
      .query({ brandId: brand.id })
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(403);
  });
});

describe("GET /api/crm/organizations", () => {
  it("lists every organization for a platform ADMIN, oldest first", async () => {
    const { organization: first } = await seedOrganization();
    await new Promise((resolve) => setTimeout(resolve, 5));
    const { organization: second } = await seedOrganization();
    const staff = await createPlatformStaffUser("Org Lister");

    const response = await request(testApp)
      .get("/api/crm/organizations")
      .set("Authorization", authHeaderFor(staff.id));

    expect(response.status).toBe(200);
    const ids = response.body.data.map((organization: { id: string }) => organization.id);
    expect(ids).toEqual(expect.arrayContaining([first.id, second.id]));
    expect(ids.indexOf(first.id)).toBeLessThan(ids.indexOf(second.id));
  });

  it("requires a platform ADMIN account", async () => {
    const shopper = await createCustomerUser("Not An Admin Either");
    const { accessToken } = generateTokenpair({ sub: shopper.id, role: UserRole.CUSTOMER });

    const response = await request(testApp)
      .get("/api/crm/organizations")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(403);
  });
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

describe("Platform access", () => {
  it("rejects a tenant-only staff member from a non-CRM admin route", async () => {
    const { organization, memberRole } = await seedOrganization();
    const staff = await createStaffUser("Tenant Only Staff");
    await addMembership(organization.id, staff.id, memberRole.id);

    const response = await request(testApp)
      .get("/api/admin/financial-rollup")
      .set("Authorization", authHeaderFor(staff.id));

    expect(response.status).toBe(403);
  });

  it("still lets a tenant-only staff member reach their own CRM organization", async () => {
    const { organization, memberRole } = await seedOrganization();
    const staff = await createStaffUser("Tenant Only Staff Two");
    await addMembership(organization.id, staff.id, memberRole.id);

    const response = await request(testApp)
      .get("/api/crm/organization")
      .set("Host", `${organization.subdomain}.localhost`)
      .set("Authorization", authHeaderFor(staff.id));

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(organization.id);
  });

  it("rejects a tenant-only staff member from creating or listing organizations", async () => {
    const { organization, memberRole } = await seedOrganization();
    const staff = await createStaffUser("Tenant Only Org Creator");
    await addMembership(organization.id, staff.id, memberRole.id);

    const listResponse = await request(testApp)
      .get("/api/crm/organizations")
      .set("Authorization", authHeaderFor(staff.id));
    expect(listResponse.status).toBe(403);

    const createResponse = await request(testApp)
      .post("/api/crm/organizations")
      .set("Authorization", authHeaderFor(staff.id))
      .send({ name: "Sneaky Org", subdomain: `sneaky-${randomUUID().slice(0, 8)}` });
    expect(createResponse.status).toBe(403);
  });

  it("rejects an ADMIN account with no CRM membership at all", async () => {
    const staff = await createStaffUser("No Membership At All");

    const response = await request(testApp)
      .get("/api/admin/financial-rollup")
      .set("Authorization", authHeaderFor(staff.id));

    expect(response.status).toBe(403);
  });

  it("allows the platform organization's SUPERADMIN", async () => {
    const { organization, adminRole } = await seedPlatformOrganization();
    const staff = await createStaffUser("Platform Super Admin");
    const membership = await addMembership(organization.id, staff.id, adminRole.id);
    await makeSuperAdmin(organization.id, membership.id);

    const response = await request(testApp)
      .get("/api/admin/financial-rollup")
      .set("Authorization", authHeaderFor(staff.id));

    expect(response.status).toBe(200);
  });

  it("allows a platform organization member holding the platform:access permission", async () => {
    const { organization, adminRole } = await seedPlatformOrganization();
    const otherAdmin = await createStaffUser("Other Platform Admin");
    const membership = await addMembership(organization.id, otherAdmin.id, adminRole.id);
    await makeSuperAdmin(organization.id, membership.id);

    const staff = await createStaffUser("Platform Admin Two");
    await addMembership(organization.id, staff.id, adminRole.id);

    const response = await request(testApp)
      .get("/api/admin/financial-rollup")
      .set("Authorization", authHeaderFor(staff.id));

    expect(response.status).toBe(200);
  });

  it("rejects a platform organization member without the platform:access permission", async () => {
    const { organization, adminRole, memberRole } = await seedPlatformOrganization();
    const superAdmin = await createStaffUser("Platform Org Owner");
    const superAdminMembership = await addMembership(organization.id, superAdmin.id, adminRole.id);
    await makeSuperAdmin(organization.id, superAdminMembership.id);

    const staff = await createStaffUser("Platform Org Regular Member");
    await addMembership(organization.id, staff.id, memberRole.id);

    const response = await request(testApp)
      .get("/api/admin/financial-rollup")
      .set("Authorization", authHeaderFor(staff.id));

    expect(response.status).toBe(403);
  });
});

describe("Ownership transfer", () => {
  it("moves superAdminMembershipId once the recipient accepts", async () => {
    const { organization, adminRole, memberRole } = await seedOrganization();
    const owner = await createStaffUser("Original Owner");
    const ownerMembership = await addMembership(organization.id, owner.id, adminRole.id);
    await makeSuperAdmin(organization.id, ownerMembership.id);

    const recipient = await createStaffUser("Ownership Recipient");
    const recipientMembership = await addMembership(organization.id, recipient.id, memberRole.id);

    const createResponse = await request(testApp)
      .post("/api/crm/ownership-transfer")
      .set("Authorization", authHeaderFor(owner.id))
      .send({ toMembershipId: recipientMembership.id });
    expect(createResponse.status).toBe(201);

    const pendingRequest = await prisma.ownershipTransferRequest.findFirstOrThrow({
      where: { organizationId: organization.id },
    });

    const acceptResponse = await request(testApp)
      .post(`/api/crm/ownership-transfer/${pendingRequest.id}/accept`)
      .set("Authorization", authHeaderFor(recipient.id));
    expect(acceptResponse.status).toBe(200);

    const updatedOrganization = await prisma.organization.findUniqueOrThrow({
      where: { id: organization.id },
    });
    expect(updatedOrganization.superAdminMembershipId).toBe(recipientMembership.id);

    const previousOwnerMembership = await prisma.membership.findUniqueOrThrow({
      where: { id: ownerMembership.id },
    });
    expect(previousOwnerMembership.roleId).toBe(adminRole.id);
  });

  it("removes the previous owner's membership once accepted when removeSenderMembership is set", async () => {
    const { organization, adminRole, memberRole } = await seedOrganization();
    const owner = await createStaffUser("Owner Removing Own Access");
    const ownerMembership = await addMembership(organization.id, owner.id, adminRole.id);
    await makeSuperAdmin(organization.id, ownerMembership.id);

    const recipient = await createStaffUser("Recipient Of Full Handoff");
    const recipientMembership = await addMembership(organization.id, recipient.id, memberRole.id);

    const createResponse = await request(testApp)
      .post("/api/crm/ownership-transfer")
      .set("Authorization", authHeaderFor(owner.id))
      .send({ toMembershipId: recipientMembership.id, removeSenderMembership: true });
    expect(createResponse.status).toBe(201);

    const pendingRequest = await prisma.ownershipTransferRequest.findFirstOrThrow({
      where: { organizationId: organization.id },
    });
    expect(pendingRequest.removeSenderMembershipOnAccept).toBe(true);

    const acceptResponse = await request(testApp)
      .post(`/api/crm/ownership-transfer/${pendingRequest.id}/accept`)
      .set("Authorization", authHeaderFor(recipient.id));
    expect(acceptResponse.status).toBe(200);

    const updatedOrganization = await prisma.organization.findUniqueOrThrow({
      where: { id: organization.id },
    });
    expect(updatedOrganization.superAdminMembershipId).toBe(recipientMembership.id);

    const previousOwnerMembership = await prisma.membership.findUnique({
      where: { id: ownerMembership.id },
    });
    expect(previousOwnerMembership).toBeNull();
  });

  it("rejects a non-SUPERADMIN member trying to create a transfer", async () => {
    const { organization, memberRole } = await seedOrganization();
    const staff = await createStaffUser("Regular Member Attempting Transfer");
    await addMembership(organization.id, staff.id, memberRole.id);

    const otherMember = await createStaffUser("Other Member");
    const otherMembership = await addMembership(organization.id, otherMember.id, memberRole.id);

    const response = await request(testApp)
      .post("/api/crm/ownership-transfer")
      .set("Authorization", authHeaderFor(staff.id))
      .send({ toMembershipId: otherMembership.id });

    expect(response.status).toBe(403);
  });

  it("rejects creating a second transfer while one is already pending", async () => {
    const { organization, adminRole, memberRole } = await seedOrganization();
    const owner = await createStaffUser("Owner With Pending Transfer");
    const ownerMembership = await addMembership(organization.id, owner.id, adminRole.id);
    await makeSuperAdmin(organization.id, ownerMembership.id);

    const firstRecipient = await createStaffUser("First Recipient");
    const firstMembership = await addMembership(organization.id, firstRecipient.id, memberRole.id);
    const secondRecipient = await createStaffUser("Second Recipient");
    const secondMembership = await addMembership(
      organization.id,
      secondRecipient.id,
      memberRole.id,
    );

    await request(testApp)
      .post("/api/crm/ownership-transfer")
      .set("Authorization", authHeaderFor(owner.id))
      .send({ toMembershipId: firstMembership.id });

    const response = await request(testApp)
      .post("/api/crm/ownership-transfer")
      .set("Authorization", authHeaderFor(owner.id))
      .send({ toMembershipId: secondMembership.id });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("TRANSFER_ALREADY_PENDING");
  });

  it("rejects a user other than the recipient trying to accept or decline", async () => {
    const { organization, adminRole, memberRole } = await seedOrganization();
    const owner = await createStaffUser("Owner For Mismatch Test");
    const ownerMembership = await addMembership(organization.id, owner.id, adminRole.id);
    await makeSuperAdmin(organization.id, ownerMembership.id);

    const recipient = await createStaffUser("Intended Recipient");
    const recipientMembership = await addMembership(organization.id, recipient.id, memberRole.id);
    const bystander = await createStaffUser("Unrelated Bystander");
    await addMembership(organization.id, bystander.id, memberRole.id);

    await request(testApp)
      .post("/api/crm/ownership-transfer")
      .set("Authorization", authHeaderFor(owner.id))
      .send({ toMembershipId: recipientMembership.id });

    const pendingRequest = await prisma.ownershipTransferRequest.findFirstOrThrow({
      where: { organizationId: organization.id },
    });

    const acceptResponse = await request(testApp)
      .post(`/api/crm/ownership-transfer/${pendingRequest.id}/accept`)
      .set("Authorization", authHeaderFor(bystander.id));
    expect(acceptResponse.status).toBe(403);

    const declineResponse = await request(testApp)
      .post(`/api/crm/ownership-transfer/${pendingRequest.id}/decline`)
      .set("Authorization", authHeaderFor(bystander.id));
    expect(declineResponse.status).toBe(403);
  });

  it("stops a revoked transfer from being acceptable", async () => {
    const { organization, adminRole, memberRole } = await seedOrganization();
    const owner = await createStaffUser("Owner Who Revokes");
    const ownerMembership = await addMembership(organization.id, owner.id, adminRole.id);
    await makeSuperAdmin(organization.id, ownerMembership.id);

    const recipient = await createStaffUser("Recipient Of Revoked Transfer");
    const recipientMembership = await addMembership(organization.id, recipient.id, memberRole.id);

    await request(testApp)
      .post("/api/crm/ownership-transfer")
      .set("Authorization", authHeaderFor(owner.id))
      .send({ toMembershipId: recipientMembership.id });

    const pendingRequest = await prisma.ownershipTransferRequest.findFirstOrThrow({
      where: { organizationId: organization.id },
    });

    const revokeResponse = await request(testApp)
      .delete(`/api/crm/ownership-transfer/${pendingRequest.id}`)
      .set("Authorization", authHeaderFor(owner.id));
    expect(revokeResponse.status).toBe(200);

    const acceptResponse = await request(testApp)
      .post(`/api/crm/ownership-transfer/${pendingRequest.id}/accept`)
      .set("Authorization", authHeaderFor(recipient.id));
    expect(acceptResponse.status).toBe(409);
    expect(acceptResponse.body.code).toBe("TRANSFER_INVALID");
  });

  it("rejects transferring ownership to a deactivated membership", async () => {
    const { organization, adminRole, memberRole } = await seedOrganization();
    const owner = await createStaffUser("Owner Targeting Deactivated Member");
    const ownerMembership = await addMembership(organization.id, owner.id, adminRole.id);
    await makeSuperAdmin(organization.id, ownerMembership.id);

    const deactivatedMember = await createStaffUser("Deactivated Target");
    const deactivatedMembership = await addMembership(
      organization.id,
      deactivatedMember.id,
      memberRole.id,
      "DEACTIVATED",
    );

    const response = await request(testApp)
      .post("/api/crm/ownership-transfer")
      .set("Authorization", authHeaderFor(owner.id))
      .send({ toMembershipId: deactivatedMembership.id });

    expect(response.status).toBe(404);
  });

  it("rejects transferring ownership to yourself", async () => {
    const { organization, adminRole } = await seedOrganization();
    const owner = await createStaffUser("Owner Transferring To Self");
    const ownerMembership = await addMembership(organization.id, owner.id, adminRole.id);
    await makeSuperAdmin(organization.id, ownerMembership.id);

    const response = await request(testApp)
      .post("/api/crm/ownership-transfer")
      .set("Authorization", authHeaderFor(owner.id))
      .send({ toMembershipId: ownerMembership.id });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("TRANSFER_SELF");
  });
});
