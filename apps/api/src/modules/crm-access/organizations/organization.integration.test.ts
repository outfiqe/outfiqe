import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import {
  addMembership,
  authHeaderFor,
  createBrand,
  createBrandOwner,
  createCustomerUser,
  createPlatformStaffUser,
  createStaffUser,
  makeSuperAdmin,
  seedOrganization,
} from "#test/integration/crm-access-fixtures.js";
import { grantLimitedPlatformStaffMembership } from "#test/integration/crm-fixtures.js";
import { ensurePlatformOrganizationExists } from "#test/integration/crm-fixtures.js";
import { testApp } from "#test/integration/test-app.js";

import {
  BUILT_IN_ROLE_NAME,
  CRM_TRIAL_LENGTH_DAYS,
  PERMISSION_CATALOG,
} from "../crm-access.constants.js";

describe("POST /api/crm/organizations", () => {
  it("creates an organization and makes the caller its SUPERADMIN", async () => {
    await prisma.permission.createMany({ data: PERMISSION_CATALOG, skipDuplicates: true });
    const creator = await createPlatformStaffUser("Org Muse");

    const response = await request(testApp)
      .post("/api/crm/organizations")
      .set("Authorization", authHeaderFor(creator.id))
      .send({ name: "Acme", subdomain: `acme-${randomUUID().slice(0, 8)}` });

    expect(response.status).toBe(201);
    expect(response.body.data.linkedBrandId).toBeNull();
    expect(response.body.data.linkedBrandName).toBeNull();

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

  it("starts a 60-day advanced-features trial for a newly created organization", async () => {
    await prisma.permission.createMany({ data: PERMISSION_CATALOG, skipDuplicates: true });
    const creator = await createPlatformStaffUser("Trial Org Muse");
    const subdomain = `trial-${randomUUID().slice(0, 8)}`;

    const response = await request(testApp)
      .post("/api/crm/organizations")
      .set("Authorization", authHeaderFor(creator.id))
      .send({ name: "Trial Co", subdomain });
    expect(response.status).toBe(201);

    const organization = await prisma.organization.findUniqueOrThrow({
      where: { id: response.body.data.id },
    });
    const daysUntilTrialEnd =
      (organization.trialEndsAt!.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
    expect(daysUntilTrialEnd).toBeGreaterThan(CRM_TRIAL_LENGTH_DAYS - 1);
    expect(daysUntilTrialEnd).toBeLessThanOrEqual(CRM_TRIAL_LENGTH_DAYS);

    const orgContext = await request(testApp)
      .get("/api/crm/organization")
      .set("Authorization", authHeaderFor(creator.id))
      .set("Host", `${subdomain}.localhost`);
    expect(orgContext.status).toBe(200);
    expect(orgContext.body.data.advancedFeaturesEnabled).toBe(true);
  });

  it("rejects a reserved subdomain", async () => {
    await prisma.permission.createMany({ data: PERMISSION_CATALOG, skipDuplicates: true });
    const creator = await createPlatformStaffUser("Reserved Subdomain Muse");

    const response = await request(testApp)
      .post("/api/crm/organizations")
      .set("Authorization", authHeaderFor(creator.id))
      .send({ name: "Impostor", subdomain: "www" });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("SUBDOMAIN_RESERVED");
  });

  it("rejects a subdomain that's already taken", async () => {
    const { organization: existing } = await seedOrganization();
    const creator = await createPlatformStaffUser("Duplicate Subdomain Muse");

    const response = await request(testApp)
      .post("/api/crm/organizations")
      .set("Authorization", authHeaderFor(creator.id))
      .send({ name: "Copycat", subdomain: existing.subdomain });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("SUBDOMAIN_TAKEN");
  });

  it("rejects a malformed subdomain", async () => {
    const creator = await createPlatformStaffUser("Malformed Subdomain Muse");

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

  it("blocks a platform staffer without platform:organizations:manage", async () => {
    const staff = await createStaffUser("No Organizations Permission");
    await grantLimitedPlatformStaffMembership(staff.id);

    const response = await request(testApp)
      .post("/api/crm/organizations")
      .set("Authorization", authHeaderFor(staff.id))
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

  it("persists and returns the linked brand when one is provided", async () => {
    const staff = await createPlatformStaffUser("Linked Brand Onboarder");
    const brand = await createBrand("Linked Brand Co");
    const owner = await createBrandOwner(brand.id);

    const response = await request(testApp)
      .post("/api/crm/organizations")
      .set("Authorization", authHeaderFor(staff.id))
      .send({
        name: brand.name,
        subdomain: `linked-${randomUUID().slice(0, 8)}`,
        targetOwnerUserId: owner.id,
        linkedBrandId: brand.id,
      });

    expect(response.status).toBe(201);
    expect(response.body.data.linkedBrandId).toBe(brand.id);
    expect(response.body.data.linkedBrandName).toBe(brand.name);

    const organization = await prisma.organization.findUniqueOrThrow({
      where: { id: response.body.data.id },
    });
    expect(organization.linkedBrandId).toBe(brand.id);
  });

  it("rejects linking a brand that already backs another organization", async () => {
    const staff = await createPlatformStaffUser("Double Link Onboarder");
    const brand = await createBrand("Already Linked Co");
    const owner = await createBrandOwner(brand.id);

    const firstResponse = await request(testApp)
      .post("/api/crm/organizations")
      .set("Authorization", authHeaderFor(staff.id))
      .send({
        name: brand.name,
        subdomain: `first-${randomUUID().slice(0, 8)}`,
        targetOwnerUserId: owner.id,
        linkedBrandId: brand.id,
      });
    expect(firstResponse.status).toBe(201);

    const secondResponse = await request(testApp)
      .post("/api/crm/organizations")
      .set("Authorization", authHeaderFor(staff.id))
      .send({
        name: brand.name,
        subdomain: `second-${randomUUID().slice(0, 8)}`,
        targetOwnerUserId: owner.id,
        linkedBrandId: brand.id,
      });

    expect(secondResponse.status).toBe(409);
    expect(secondResponse.body.code).toBe("BRAND_ALREADY_LINKED");
    expect(JSON.stringify(secondResponse.body)).not.toMatch(/prisma|constraint|P2002/i);
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
    expect(response.body.data.existingOrganizationForBrand).toBeNull();
  });

  it("surfaces the organization a brand is already linked to", async () => {
    const staff = await createPlatformStaffUser("Already Linked Suggestion Requester");
    const brand = await createBrand("Twice Onboarded Co");
    const owner = await createBrandOwner(brand.id);

    const createResponse = await request(testApp)
      .post("/api/crm/organizations")
      .set("Authorization", authHeaderFor(staff.id))
      .send({
        name: brand.name,
        subdomain: `twice-${randomUUID().slice(0, 8)}`,
        targetOwnerUserId: owner.id,
        linkedBrandId: brand.id,
      });
    expect(createResponse.status).toBe(201);

    const response = await request(testApp)
      .get("/api/crm/organizations/suggest")
      .query({ brandId: brand.id })
      .set("Authorization", authHeaderFor(staff.id));

    expect(response.status).toBe(200);
    expect(response.body.data.existingOrganizationForBrand).toEqual({
      id: createResponse.body.data.id,
      name: brand.name,
    });
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
  it("lists every tenant organization for a platform ADMIN, oldest first", async () => {
    const { organization: first } = await seedOrganization();
    await new Promise((resolve) => setTimeout(resolve, 5));
    const { organization: second } = await seedOrganization();
    const staff = await createPlatformStaffUser("Org Lister");

    const response = await request(testApp)
      .get("/api/crm/organizations")
      .set("Authorization", authHeaderFor(staff.id));

    expect(response.status).toBe(200);
    const ids = response.body.data.organizations.map(
      (organization: { id: string }) => organization.id,
    );
    expect(ids).toEqual(expect.arrayContaining([first.id, second.id]));
    expect(ids.indexOf(first.id)).toBeLessThan(ids.indexOf(second.id));
    for (const organization of response.body.data.organizations) {
      expect(organization).toHaveProperty("linkedBrandName");
    }
  });

  it("paginates with a cursor once more organizations exist than the page limit", async () => {
    const { organization: first } = await seedOrganization();
    await new Promise((resolve) => setTimeout(resolve, 5));
    const { organization: second } = await seedOrganization();
    const staff = await createPlatformStaffUser("Org Paginator");

    const firstPage = await request(testApp)
      .get("/api/crm/organizations")
      .query({ limit: 1 })
      .set("Authorization", authHeaderFor(staff.id));

    expect(firstPage.status).toBe(200);
    expect(firstPage.body.data.organizations).toHaveLength(1);
    expect(firstPage.body.data.organizations[0].id).toBe(first.id);
    expect(firstPage.body.data.nextCursor).toBe(first.id);

    const secondPage = await request(testApp)
      .get("/api/crm/organizations")
      .query({ limit: 1, cursor: firstPage.body.data.nextCursor })
      .set("Authorization", authHeaderFor(staff.id));

    expect(secondPage.status).toBe(200);
    const secondPageIds = secondPage.body.data.organizations.map(
      (organization: { id: string }) => organization.id,
    );
    expect(secondPageIds).toContain(second.id);
  });

  it("excludes the platform organization, which is not a tenant", async () => {
    const platformOrganization = await ensurePlatformOrganizationExists();
    const { organization: tenant } = await seedOrganization();
    const staff = await createPlatformStaffUser("Platform Org Excluder");

    const response = await request(testApp)
      .get("/api/crm/organizations")
      .set("Authorization", authHeaderFor(staff.id));

    expect(response.status).toBe(200);
    const ids = response.body.data.organizations.map(
      (organization: { id: string }) => organization.id,
    );
    expect(ids).toContain(tenant.id);
    expect(ids).not.toContain(platformOrganization.id);
  });

  it("includes the linked brand name for a brand-linked organization", async () => {
    const brand = await createBrand("Rollup Brand Co");
    const { organization } = await seedOrganization();
    await prisma.organization.update({
      where: { id: organization.id },
      data: { linkedBrandId: brand.id },
    });
    const staff = await createPlatformStaffUser("Linked Org Lister");

    const response = await request(testApp)
      .get("/api/crm/organizations")
      .set("Authorization", authHeaderFor(staff.id));

    expect(response.status).toBe(200);
    const linkedOrganization = response.body.data.organizations.find(
      (candidate: { id: string }) => candidate.id === organization.id,
    );
    expect(linkedOrganization.linkedBrandName).toBe("Rollup Brand Co");
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
    const { organization } = await seedOrganization();
    const staff = await createStaffUser("No Membership");

    const response = await request(testApp)
      .get("/api/crm/organization")
      .set("Host", `${organization.subdomain}.localhost`)
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
      .set("Host", `${organization.subdomain}.localhost`)
      .set("Authorization", authHeaderFor(staff.id));

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(organization.id);
    expect(response.body.data.viewerRoleName).toBe(BUILT_IN_ROLE_NAME.ADMIN);
  });

  it("allows a Member-role holder, since org:read is in the Member permission set", async () => {
    const { organization, memberRole } = await seedOrganization();
    const staff = await createStaffUser("Regular Member");
    await addMembership(organization.id, staff.id, memberRole.id);

    const response = await request(testApp)
      .get("/api/crm/organization")
      .set("Host", `${organization.subdomain}.localhost`)
      .set("Authorization", authHeaderFor(staff.id));

    expect(response.status).toBe(200);
  });

  it("rejects a deactivated membership", async () => {
    const { organization, memberRole } = await seedOrganization();
    const staff = await createStaffUser("Deactivated Member");
    await addMembership(organization.id, staff.id, memberRole.id, "DEACTIVATED");

    const response = await request(testApp)
      .get("/api/crm/organization")
      .set("Host", `${organization.subdomain}.localhost`)
      .set("Authorization", authHeaderFor(staff.id));

    expect(response.status).toBe(403);
  });
});
