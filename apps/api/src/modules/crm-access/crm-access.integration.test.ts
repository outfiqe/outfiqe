import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { prisma } from "#db/prisma.js";
import { eventBus } from "#events/event-bus.js";
import {
  addMembership,
  authHeaderFor,
  createStaffUser,
  makeSuperAdmin,
  seedOrganization,
} from "#test/integration/crm-access-fixtures.js";
import { seedPlatformOrganization } from "#test/integration/crm-fixtures.js";
import { testApp } from "#test/integration/test-app.js";

describe("PATCH /api/crm/members/:membershipId", () => {
  it("blocks an admin from changing their own role", async () => {
    const { organization, adminRole, memberRole } = await seedOrganization();
    const admin = await createStaffUser("Self Demoting Admin");
    const adminMembership = await addMembership(organization.id, admin.id, adminRole.id);

    const response = await request(testApp)
      .patch(`/api/crm/members/${adminMembership.id}`)
      .set("Host", `${organization.subdomain}.localhost`)
      .set("Authorization", authHeaderFor(admin.id))
      .send({ roleId: memberRole.id });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("MEMBERSHIP_SELF_UPDATE_FORBIDDEN");

    const unchanged = await prisma.membership.findUniqueOrThrow({
      where: { id: adminMembership.id },
    });
    expect(unchanged.roleId).toBe(adminRole.id);
  });

  it("announces that a member lost access when they are deactivated", async () => {
    const { organization, adminRole, memberRole } = await seedOrganization();
    const owner = await createStaffUser("Deactivating Owner");
    const ownerMembership = await addMembership(organization.id, owner.id, adminRole.id);
    await makeSuperAdmin(organization.id, ownerMembership.id);
    const leaver = await createStaffUser("Leaving Member");
    const leaverMembership = await addMembership(organization.id, leaver.id, memberRole.id);

    const publishSpy = vi.spyOn(eventBus, "publish").mockResolvedValue(undefined);
    const response = await request(testApp)
      .patch(`/api/crm/members/${leaverMembership.id}`)
      .set("Host", `${organization.subdomain}.localhost`)
      .set("Authorization", authHeaderFor(owner.id))
      .send({ status: "DEACTIVATED" });

    expect(response.status).toBe(200);
    expect(publishSpy).toHaveBeenCalledWith("crm.membership.ended", {
      organizationId: organization.id,
      userId: leaver.id,
    });
    publishSpy.mockRestore();
  });

  it("does not announce a lost membership when only the role changes", async () => {
    const { organization, adminRole, memberRole } = await seedOrganization();
    const owner = await createStaffUser("Role Changing Owner");
    const ownerMembership = await addMembership(organization.id, owner.id, adminRole.id);
    await makeSuperAdmin(organization.id, ownerMembership.id);
    const promoted = await createStaffUser("Promoted Member");
    const promotedMembership = await addMembership(organization.id, promoted.id, memberRole.id);

    const publishSpy = vi.spyOn(eventBus, "publish").mockResolvedValue(undefined);
    const response = await request(testApp)
      .patch(`/api/crm/members/${promotedMembership.id}`)
      .set("Host", `${organization.subdomain}.localhost`)
      .set("Authorization", authHeaderFor(owner.id))
      .send({ roleId: adminRole.id });

    expect(response.status).toBe(200);
    expect(publishSpy).not.toHaveBeenCalledWith("crm.membership.ended", expect.anything());
    publishSpy.mockRestore();
  });

  it("blocks an admin from deactivating their own membership", async () => {
    const { organization, adminRole } = await seedOrganization();
    const admin = await createStaffUser("Self Deactivating Admin");
    const adminMembership = await addMembership(organization.id, admin.id, adminRole.id);

    const response = await request(testApp)
      .patch(`/api/crm/members/${adminMembership.id}`)
      .set("Host", `${organization.subdomain}.localhost`)
      .set("Authorization", authHeaderFor(admin.id))
      .send({ status: "DEACTIVATED" });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("MEMBERSHIP_SELF_UPDATE_FORBIDDEN");
  });

  it("lets an admin change another member's role", async () => {
    const { organization, adminRole, memberRole } = await seedOrganization();
    const admin = await createStaffUser("Acting Admin");
    await addMembership(organization.id, admin.id, adminRole.id);
    const teammate = await createStaffUser("Promoted Teammate");
    const teammateMembership = await addMembership(organization.id, teammate.id, memberRole.id);

    const response = await request(testApp)
      .patch(`/api/crm/members/${teammateMembership.id}`)
      .set("Host", `${organization.subdomain}.localhost`)
      .set("Authorization", authHeaderFor(admin.id))
      .send({ roleId: adminRole.id });

    expect(response.status).toBe(200);

    const updated = await prisma.membership.findUniqueOrThrow({
      where: { id: teammateMembership.id },
    });
    expect(updated.roleId).toBe(adminRole.id);
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

  it("falls back to the platform organization when no subdomain is present", async () => {
    const { organization, adminRole } = await seedPlatformOrganization();
    const staff = await createStaffUser("Platform Org User");
    const membership = await addMembership(organization.id, staff.id, adminRole.id);
    await makeSuperAdmin(organization.id, membership.id);

    const response = await request(testApp)
      .get("/api/crm/organization")
      .set("Authorization", authHeaderFor(staff.id));

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(organization.id);
    expect(response.body.data.isPlatformOrg).toBe(true);
  });

  it("resolves to the platform organization when no subdomain is present, even alongside tenant organizations", async () => {
    const { organization, adminRole } = await seedPlatformOrganization();
    await seedOrganization();
    const staff = await createStaffUser("Platform Org User Two");
    const membership = await addMembership(organization.id, staff.id, adminRole.id);
    await makeSuperAdmin(organization.id, membership.id);

    const response = await request(testApp)
      .get("/api/crm/organization")
      .set("Authorization", authHeaderFor(staff.id));

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(organization.id);
    expect(response.body.data.isPlatformOrg).toBe(true);
  });

  it("returns 404 when no subdomain is present and no platform organization exists yet", async () => {
    await seedOrganization();
    const staff = await createStaffUser("No Platform Org User");

    const response = await request(testApp)
      .get("/api/crm/organization")
      .set("Authorization", authHeaderFor(staff.id));

    expect(response.status).toBe(404);
    expect(response.body.code).toBe("ORGANIZATION_NOT_FOUND");
  });

  it("prefers X-Forwarded-Host over the literal Host header, matching a real proxy chain", async () => {
    const { organization, adminRole } = await seedOrganization({ subdomain: "proxied-corp" });
    const staff = await createStaffUser("Proxied Owner");
    const membership = await addMembership(organization.id, staff.id, adminRole.id);
    await makeSuperAdmin(organization.id, membership.id);

    const response = await request(testApp)
      .get("/api/crm/organization")
      .set("Host", "api.localhost")
      .set("X-Forwarded-Host", "proxied-corp.localhost")
      .set("Authorization", authHeaderFor(staff.id));

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(organization.id);
  });

  it("never grants cross-tenant access from a forged X-Forwarded-Host header", async () => {
    const orgA = await seedOrganization({ subdomain: "forge-a" });
    const orgB = await seedOrganization({ subdomain: "forge-b" });

    const staffA = await createStaffUser("Forge A Owner");
    const membershipA = await addMembership(orgA.organization.id, staffA.id, orgA.adminRole.id);
    await makeSuperAdmin(orgA.organization.id, membershipA.id);

    const response = await request(testApp)
      .get("/api/crm/organization")
      .set("Host", "forge-a.localhost")
      .set("X-Forwarded-Host", "forge-b.localhost")
      .set("Authorization", authHeaderFor(staffA.id));

    expect(response.status).toBe(403);
    expect(response.body.data?.id).not.toBe(orgB.organization.id);
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
    const staff = await createStaffUser("Tenant Only Org Muse");
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

describe("Permission escalation guards", () => {
  const seedSuperAdminOrganization = async (label: string) => {
    const { organization, adminRole, memberRole } = await seedOrganization();
    const owner = await createStaffUser(`${label} Owner`);
    const ownerMembership = await addMembership(organization.id, owner.id, adminRole.id);
    await makeSuperAdmin(organization.id, ownerMembership.id);
    return { organization, owner, adminRole, memberRole };
  };

  const host = (subdomain: string) => `${subdomain}.localhost`;

  const createCustomRole = async (organizationId: string, name: string, permissionKeys: string[]) =>
    prisma.role.create({
      data: {
        organizationId,
        name,
        isBuiltIn: false,
        permissions: { create: permissionKeys.map((permissionKey) => ({ permissionKey })) },
      },
    });

  it("blocks a roles:manage holder from creating a role with a permission they don't hold themselves", async () => {
    const { organization } = await seedSuperAdminOrganization("Create Escalation");
    const limitedRole = await createCustomRole(organization.id, "Role Editor", ["roles:manage"]);
    const actor = await createStaffUser("Limited Role Editor");
    await addMembership(organization.id, actor.id, limitedRole.id);

    const response = await request(testApp)
      .post("/api/crm/roles")
      .set("Authorization", authHeaderFor(actor.id))
      .set("Host", host(organization.subdomain))
      .send({ name: "Self-Granted Power", permissionKeys: ["roles:manage", "billing:manage"] });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("PERMISSION_EXCEEDS_ACTOR_GRANT");
    expect(
      await prisma.role.findFirst({
        where: { organizationId: organization.id, name: "Self-Granted Power" },
      }),
    ).toBeNull();
  });

  it("lets a roles:manage holder create a role limited to permissions they already hold", async () => {
    const { organization } = await seedSuperAdminOrganization("Create Within Grant");
    const limitedRole = await createCustomRole(organization.id, "Role Editor Two", [
      "roles:manage",
      "tickets:read",
    ]);
    const actor = await createStaffUser("Compliant Role Editor");
    await addMembership(organization.id, actor.id, limitedRole.id);

    const response = await request(testApp)
      .post("/api/crm/roles")
      .set("Authorization", authHeaderFor(actor.id))
      .set("Host", host(organization.subdomain))
      .send({ name: "Ticket Reader", permissionKeys: ["tickets:read"] });

    expect(response.status).toBe(201);
  });

  it("blocks adding an ungranted permission to an existing role, but still allows shrinking it", async () => {
    const { organization } = await seedSuperAdminOrganization("Update Escalation");
    const target = await createCustomRole(organization.id, "Target Role", [
      "tickets:read",
      "tickets:write",
    ]);
    const limitedRole = await createCustomRole(organization.id, "Role Editor Three", [
      "roles:manage",
      "tickets:read",
    ]);
    const actor = await createStaffUser("Limited Role Editor Two");
    await addMembership(organization.id, actor.id, limitedRole.id);

    const escalate = await request(testApp)
      .patch(`/api/crm/roles/${target.id}`)
      .set("Authorization", authHeaderFor(actor.id))
      .set("Host", host(organization.subdomain))
      .send({ permissionKeys: ["tickets:read", "billing:manage"] });
    expect(escalate.status).toBe(403);
    expect(escalate.body.code).toBe("PERMISSION_EXCEEDS_ACTOR_GRANT");

    const shrink = await request(testApp)
      .patch(`/api/crm/roles/${target.id}`)
      .set("Authorization", authHeaderFor(actor.id))
      .set("Host", host(organization.subdomain))
      .send({ permissionKeys: ["tickets:read"] });
    expect(shrink.status).toBe(200);
    expect(shrink.body.data.permissionKeys).toEqual(["tickets:read"]);
  });

  it("blocks a members:manage holder from reassigning a teammate into a role with permissions they don't hold", async () => {
    const { organization, memberRole } = await seedSuperAdminOrganization("Membership Escalation");
    const powerfulRole = await createCustomRole(organization.id, "Billing Boss", [
      "billing:manage",
    ]);
    const limitedRole = await createCustomRole(organization.id, "Member Manager", [
      "members:manage",
    ]);
    const actor = await createStaffUser("Limited Member Manager");
    await addMembership(organization.id, actor.id, limitedRole.id);
    const teammate = await createStaffUser("Reassignment Target");
    const teammateMembership = await addMembership(organization.id, teammate.id, memberRole.id);

    const response = await request(testApp)
      .patch(`/api/crm/members/${teammateMembership.id}`)
      .set("Authorization", authHeaderFor(actor.id))
      .set("Host", host(organization.subdomain))
      .send({ roleId: powerfulRole.id });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("PERMISSION_EXCEEDS_ACTOR_GRANT");

    const unchanged = await prisma.membership.findUniqueOrThrow({
      where: { id: teammateMembership.id },
    });
    expect(unchanged.roleId).toBe(memberRole.id);
  });

  it("blocks a members:invite holder from inviting someone straight into the built-in Admin role", async () => {
    const { organization, adminRole } = await seedSuperAdminOrganization("Invite Escalation");
    const limitedRole = await createCustomRole(organization.id, "Inviter Only", ["members:invite"]);
    const actor = await createStaffUser("Limited Inviter");
    await addMembership(organization.id, actor.id, limitedRole.id);
    const strangerEmail = `escalated-invite-${randomUUID()}@outfiqe.test`;

    const response = await request(testApp)
      .post("/api/crm/invites")
      .set("Authorization", authHeaderFor(actor.id))
      .set("Host", host(organization.subdomain))
      .send({ email: strangerEmail, roleId: adminRole.id });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("PERMISSION_EXCEEDS_ACTOR_GRANT");
    expect(
      await prisma.organizationInvite.findFirst({
        where: { organizationId: organization.id, email: strangerEmail },
      }),
    ).toBeNull();
  });

  it("still lets a SUPERADMIN grant any role, even one holding a limited role themselves", async () => {
    const { organization, memberRole, adminRole } =
      await seedSuperAdminOrganization("Superadmin Bypass");
    const transferredSuperAdminUser = await createStaffUser("Transferred Superadmin");
    const transferredSuperAdminMembership = await addMembership(
      organization.id,
      transferredSuperAdminUser.id,
      memberRole.id,
    );
    await makeSuperAdmin(organization.id, transferredSuperAdminMembership.id);

    const teammate = await createStaffUser("Promotion Target Under New Superadmin");
    const teammateMembership = await addMembership(organization.id, teammate.id, memberRole.id);

    const response = await request(testApp)
      .patch(`/api/crm/members/${teammateMembership.id}`)
      .set("Authorization", authHeaderFor(transferredSuperAdminUser.id))
      .set("Host", host(organization.subdomain))
      .send({ roleId: adminRole.id });

    expect(response.status).toBe(200);
  });
});
