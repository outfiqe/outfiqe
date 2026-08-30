import { randomUUID } from "node:crypto";

import { addDays } from "date-fns/addDays";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { crmAccessRepository } from "#modules/crm-access/crm-access.repository.js";
import { seedTenantOrganization } from "#test/integration/crmFixtures.js";
import { testApp } from "#test/integration/testApp.js";

const uniquePhone = () => `98${randomUUID().replace(/\D/g, "1").slice(0, 8)}`;

const authHeaderFor = (userId: string) => {
  const { accessToken } = generateTokenpair({ sub: userId, role: UserRole.ADMIN });
  return `Bearer ${accessToken}`;
};

const createStaff = (name: string) =>
  prisma.user.create({
    data: {
      email: `${name.toLowerCase().replace(/\s+/g, "-")}-${randomUUID()}@outfiqe.test`,
      name,
      handle: `${name.toLowerCase().replace(/\s+/g, "-")}-${randomUUID().slice(0, 8)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role: UserRole.ADMIN,
    },
  });

const host = (subdomain: string) => `${subdomain}.localhost`;

const seedAuditTenant = async () => {
  const { organization, adminRole } = await seedTenantOrganization();
  const owner = await createStaff("Audit Owner");
  const ownerMembership = await prisma.membership.create({
    data: {
      organizationId: organization.id,
      userId: owner.id,
      roleId: adminRole.id,
      status: "ACTIVE",
    },
  });
  await prisma.organization.update({
    where: { id: organization.id },
    data: { superAdminMembershipId: ownerMembership.id, trialEndsAt: addDays(new Date(), 10) },
  });
  return { organization, adminRole, owner };
};

const auditActionsFor = async (ownerId: string, subdomain: string) => {
  const response = await request(testApp)
    .get("/api/crm/audit")
    .query({ limit: 100 })
    .set("Authorization", authHeaderFor(ownerId))
    .set("Host", host(subdomain));
  return response.body.data.entries.map((entry: { action: string }) => entry.action);
};

describe("audited controller branches", () => {
  it("labels a member role change and a member status change distinctly", async () => {
    const { organization, adminRole, owner } = await seedAuditTenant();
    const memberRole = await crmAccessRepository.createRole({
      organizationId: organization.id,
      name: "Plain",
      permissionKeys: ["org:read"],
    });
    const teammate = await createStaff("Audited Member");
    const membership = await prisma.membership.create({
      data: {
        organizationId: organization.id,
        userId: teammate.id,
        roleId: memberRole.id,
        status: "ACTIVE",
      },
    });

    await request(testApp)
      .patch(`/api/crm/members/${membership.id}`)
      .set("Authorization", authHeaderFor(owner.id))
      .set("Host", host(organization.subdomain))
      .send({ roleId: adminRole.id })
      .expect(200);
    await request(testApp)
      .patch(`/api/crm/members/${membership.id}`)
      .set("Authorization", authHeaderFor(owner.id))
      .set("Host", host(organization.subdomain))
      .send({ status: "DEACTIVATED" })
      .expect(200);

    const actions = await auditActionsFor(owner.id, organization.subdomain);
    expect(actions).toContain("MEMBER_ROLE_CHANGED");
    expect(actions).toContain("MEMBER_STATUS_CHANGED");
  });

  it("records a rename-only and a permissions-only role update", async () => {
    const { organization, owner } = await seedAuditTenant();
    const created = await request(testApp)
      .post("/api/crm/roles")
      .set("Authorization", authHeaderFor(owner.id))
      .set("Host", host(organization.subdomain))
      .send({ name: "Editor", permissionKeys: ["deals:read"] });

    await request(testApp)
      .patch(`/api/crm/roles/${created.body.data.id}`)
      .set("Authorization", authHeaderFor(owner.id))
      .set("Host", host(organization.subdomain))
      .send({ name: "Deal editor" })
      .expect(200);
    await request(testApp)
      .patch(`/api/crm/roles/${created.body.data.id}`)
      .set("Authorization", authHeaderFor(owner.id))
      .set("Host", host(organization.subdomain))
      .send({ permissionKeys: ["deals:read", "deals:write"] })
      .expect(200);

    const roleUpdates = await prisma.crmAuditLog.findMany({
      where: { organizationId: organization.id, action: "ROLE_UPDATED" },
    });
    expect(roleUpdates).toHaveLength(2);
    const flags = roleUpdates.map((entry) => entry.metadata as { renamed?: boolean });
    expect(flags.some((meta) => meta.renamed === true)).toBe(true);
    expect(flags.some((meta) => meta.renamed === false)).toBe(true);
  });

  it("records every ownership-transfer transition", async () => {
    const { organization, adminRole, owner } = await seedAuditTenant();
    const target = await createStaff("Transfer Target");
    const targetMembership = await prisma.membership.create({
      data: {
        organizationId: organization.id,
        userId: target.id,
        roleId: adminRole.id,
        status: "ACTIVE",
      },
    });

    const requestTransfer = () =>
      request(testApp)
        .post("/api/crm/ownership-transfer")
        .set("Authorization", authHeaderFor(owner.id))
        .set("Host", host(organization.subdomain))
        .send({ toMembershipId: targetMembership.id });

    expect((await requestTransfer()).status).toBe(201);
    const pending1 = await prisma.ownershipTransferRequest.findFirstOrThrow({
      where: { organizationId: organization.id },
    });
    await request(testApp)
      .post(`/api/crm/ownership-transfer/${pending1.id}/decline`)
      .set("Authorization", authHeaderFor(target.id))
      .set("Host", host(organization.subdomain))
      .expect(200);

    expect((await requestTransfer()).status).toBe(201);
    const pending2 = await prisma.ownershipTransferRequest.findFirstOrThrow({
      where: { organizationId: organization.id, declinedAt: null },
    });
    await request(testApp)
      .delete(`/api/crm/ownership-transfer/${pending2.id}`)
      .set("Authorization", authHeaderFor(owner.id))
      .set("Host", host(organization.subdomain))
      .expect(200);

    expect((await requestTransfer()).status).toBe(201);
    const pending3 = await prisma.ownershipTransferRequest.findFirstOrThrow({
      where: { organizationId: organization.id, declinedAt: null, revokedAt: null },
    });
    await request(testApp)
      .post(`/api/crm/ownership-transfer/${pending3.id}/accept`)
      .set("Authorization", authHeaderFor(target.id))
      .set("Host", host(organization.subdomain))
      .expect(200);

    const actions = await auditActionsFor(target.id, organization.subdomain);
    expect(actions).toEqual(
      expect.arrayContaining([
        "OWNERSHIP_TRANSFER_REQUESTED",
        "OWNERSHIP_TRANSFER_DECLINED",
        "OWNERSHIP_TRANSFER_REVOKED",
        "OWNERSHIP_TRANSFER_ACCEPTED",
      ]),
    );
  });

  it("shows a null actor name for an entry whose actor user was deleted", async () => {
    const { organization, owner } = await seedAuditTenant();
    await request(testApp)
      .patch("/api/crm/organization")
      .set("Authorization", authHeaderFor(owner.id))
      .set("Host", host(organization.subdomain))
      .send({ name: "Ghost Co" })
      .expect(200);

    await prisma.crmAuditLog.updateMany({
      where: { organizationId: organization.id },
      data: { actorUserId: null },
    });

    const response = await request(testApp)
      .get("/api/crm/audit")
      .set("Authorization", authHeaderFor(owner.id))
      .set("Host", host(organization.subdomain));

    expect(response.body.data.entries[0].actorName).toBeNull();
  });
});

describe("requireAnyPermission via GET /api/crm/search", () => {
  it("403s a member whose CRM membership is deactivated", async () => {
    const { organization, adminRole } = await seedAuditTenant();
    const staff = await createStaff("Deactivated Searcher");
    await prisma.membership.create({
      data: {
        organizationId: organization.id,
        userId: staff.id,
        roleId: adminRole.id,
        status: "DEACTIVATED",
      },
    });

    const response = await request(testApp)
      .get("/api/crm/search")
      .query({ q: "spring" })
      .set("Authorization", authHeaderFor(staff.id))
      .set("Host", host(organization.subdomain));

    expect(response.status).toBe(403);
  });

  it("403s an ADMIN account with no membership on the resolved organization", async () => {
    const { organization } = await seedAuditTenant();
    const stranger = await createStaff("No Membership Searcher");

    const response = await request(testApp)
      .get("/api/crm/search")
      .query({ q: "spring" })
      .set("Authorization", authHeaderFor(stranger.id))
      .set("Host", host(organization.subdomain));

    expect(response.status).toBe(403);
  });

  it("allows a member holding just one of the searchable read permissions", async () => {
    const { organization } = await seedAuditTenant();
    const supportRole = await crmAccessRepository.createRole({
      organizationId: organization.id,
      name: "Support search",
      permissionKeys: ["org:read", "tickets:read"],
    });
    const agent = await createStaff("Support Searcher");
    await prisma.membership.create({
      data: {
        organizationId: organization.id,
        userId: agent.id,
        roleId: supportRole.id,
        status: "ACTIVE",
      },
    });

    const response = await request(testApp)
      .get("/api/crm/search")
      .query({ q: "spring" })
      .set("Authorization", authHeaderFor(agent.id))
      .set("Host", host(organization.subdomain));

    expect(response.status).toBe(200);
    expect(response.body.data.deals).toEqual([]);
  });
});
