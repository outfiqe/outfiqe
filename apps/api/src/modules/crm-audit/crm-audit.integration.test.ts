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
import { uniquePhone } from "#test/integration/uniqueValues.js";

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

describe("CRM audit log", () => {
  it("records an entry for an audited mutation and returns it, newest first", async () => {
    const { organization, owner } = await seedAuditTenant();

    await request(testApp)
      .post("/api/crm/roles")
      .set("Authorization", authHeaderFor(owner.id))
      .set("Host", host(organization.subdomain))
      .send({ name: "Analyst", permissionKeys: ["reports:read"] })
      .expect(201);

    await request(testApp)
      .patch("/api/crm/organization")
      .set("Authorization", authHeaderFor(owner.id))
      .set("Host", host(organization.subdomain))
      .send({ name: "Renamed Audit Co" })
      .expect(200);

    const response = await request(testApp)
      .get("/api/crm/audit")
      .set("Authorization", authHeaderFor(owner.id))
      .set("Host", host(organization.subdomain));

    expect(response.status).toBe(200);
    const actions = response.body.data.entries.map((entry: { action: string }) => entry.action);
    expect(actions.slice(0, 2)).toEqual(["ORGANIZATION_RENAMED", "ROLE_CREATED"]);

    const renameEntry = response.body.data.entries[0];
    expect(renameEntry.actorName).toBe("Audit Owner");
    expect(renameEntry.summary).toContain("Renamed Audit Co");
    expect(renameEntry.metadata.previousName).toBeDefined();
  });

  it("never stores raw secrets or tokens in an audit entry", async () => {
    const { organization, adminRole, owner } = await seedAuditTenant();
    const invitee = await createStaff("Audit Invitee");

    await request(testApp)
      .post("/api/crm/invites")
      .set("Authorization", authHeaderFor(owner.id))
      .set("Host", host(organization.subdomain))
      .send({ email: invitee.email, roleId: adminRole.id })
      .expect(201);

    const entry = await prisma.crmAuditLog.findFirstOrThrow({
      where: { organizationId: organization.id, action: "INVITE_SENT" },
    });
    const serialized = JSON.stringify(entry);
    expect(serialized).not.toMatch(/tokenHash|passwordHash|Bearer /);
    expect(entry.summary).toContain(invitee.email);
  });

  it("denies the audit log to a member without audit:read", async () => {
    const { organization } = await seedAuditTenant();
    const limitedRole = await crmAccessRepository.createRole({
      organizationId: organization.id,
      name: "No audit",
      permissionKeys: ["org:read", "members:read"],
    });
    const teammate = await createStaff("No Audit Member");
    await prisma.membership.create({
      data: {
        organizationId: organization.id,
        userId: teammate.id,
        roleId: limitedRole.id,
        status: "ACTIVE",
      },
    });

    const response = await request(testApp)
      .get("/api/crm/audit")
      .set("Authorization", authHeaderFor(teammate.id))
      .set("Host", host(organization.subdomain));

    expect(response.status).toBe(403);
  });

  it("scopes the audit log to the caller's own organization", async () => {
    const first = await seedAuditTenant();
    const second = await seedAuditTenant();

    await request(testApp)
      .patch("/api/crm/organization")
      .set("Authorization", authHeaderFor(first.owner.id))
      .set("Host", host(first.organization.subdomain))
      .send({ name: "First Co Renamed" })
      .expect(200);

    const response = await request(testApp)
      .get("/api/crm/audit")
      .set("Authorization", authHeaderFor(second.owner.id))
      .set("Host", host(second.organization.subdomain));

    expect(response.status).toBe(200);
    expect(response.body.data.entries).toEqual([]);
  });

  it("paginates with a cursor", async () => {
    const { organization, owner } = await seedAuditTenant();

    for (let index = 0; index < 3; index += 1) {
      await request(testApp)
        .patch("/api/crm/organization")
        .set("Authorization", authHeaderFor(owner.id))
        .set("Host", host(organization.subdomain))
        .send({ name: `Rename ${index}` })
        .expect(200);
    }

    const firstPage = await request(testApp)
      .get("/api/crm/audit")
      .query({ limit: 2 })
      .set("Authorization", authHeaderFor(owner.id))
      .set("Host", host(organization.subdomain));

    expect(firstPage.body.data.entries).toHaveLength(2);
    expect(firstPage.body.data.nextCursor).not.toBeNull();

    const secondPage = await request(testApp)
      .get("/api/crm/audit")
      .query({ limit: 2, cursor: firstPage.body.data.nextCursor })
      .set("Authorization", authHeaderFor(owner.id))
      .set("Host", host(organization.subdomain));

    expect(secondPage.body.data.entries.length).toBeGreaterThanOrEqual(1);
    const firstIds = firstPage.body.data.entries.map((entry: { id: string }) => entry.id);
    const secondIds = secondPage.body.data.entries.map((entry: { id: string }) => entry.id);
    expect(firstIds.some((id: string) => secondIds.includes(id))).toBe(false);
  });
});
