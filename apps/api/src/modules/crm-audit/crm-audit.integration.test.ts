import { randomUUID } from "node:crypto";

import { addDays } from "date-fns/addDays";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { CrmAuditAction, UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { crmAccessRepository } from "#modules/crm-access/crm-access.repository.js";
import { seedTenantOrganization } from "#test/integration/crm-fixtures.js";
import { testApp } from "#test/integration/test-app.js";
import { uniquePhone } from "#test/integration/unique-values.js";

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
    expect(renameEntry.actorAvatarUrl).toBeNull();
    expect(renameEntry.actorMember).toMatchObject({
      roleName: expect.any(String),
      joinedAt: expect.any(String),
    });
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

  it("filters by group, person and date, and offers only choices from this log", async () => {
    const { organization, owner } = await seedAuditTenant();
    const addEntry = (action: CrmAuditAction, createdAt: Date) =>
      prisma.crmAuditLog.create({
        data: {
          organizationId: organization.id,
          action,
          summary: action,
          actorUserId: owner.id,
          createdAt,
        },
      });
    await addEntry(CrmAuditAction.ROLE_CREATED, new Date("2026-08-10T10:00:00.000Z"));
    await addEntry(CrmAuditAction.SUBSCRIPTION_ACTIVATED, new Date("2026-08-11T10:00:00.000Z"));
    await addEntry(CrmAuditAction.SUBSCRIPTION_CANCELED, new Date("2026-09-20T10:00:00.000Z"));
    const auditGet = (path: string, query: Record<string, string>) =>
      request(testApp)
        .get(path)
        .query(query)
        .set("Authorization", authHeaderFor(owner.id))
        .set("Host", host(organization.subdomain));

    const billingInAugust = await auditGet("/api/crm/audit", {
      group: "billing",
      from: "2026-08-01T00:00:00.000Z",
      to: "2026-08-31T23:59:59.999Z",
    });
    expect(
      billingInAugust.body.data.entries.map(({ action }: { action: string }) => action),
    ).toEqual(["SUBSCRIPTION_ACTIVATED"]);

    const choices = await auditGet("/api/crm/audit/filters", {});
    expect(choices.body.data.actions).toHaveLength(3);
    expect(choices.body.data.actors).toEqual([expect.objectContaining({ id: owner.id })]);
  });

  it("exports the filtered log without addresses, and only this tenant's", async () => {
    const tenant = await seedAuditTenant();
    const other = await seedAuditTenant();
    const addEntry = (organizationId: string, summary: string) =>
      prisma.crmAuditLog.create({
        data: {
          organizationId,
          action: CrmAuditAction.ROLE_CREATED,
          summary,
          ipAddress: "203.0.113.9",
        },
      });
    await addEntry(tenant.organization.id, "=Our entry");
    await addEntry(other.organization.id, "Their entry");

    const exported = await request(testApp)
      .get("/api/crm/audit/export")
      .set("Authorization", authHeaderFor(tenant.owner.id))
      .set("Host", host(tenant.organization.subdomain));

    expect(exported.status).toBe(200);
    expect(exported.headers["content-type"]).toContain("text/csv");
    expect(exported.text).toContain("'=Our entry");
    expect(exported.text).not.toContain("Their entry");
    expect(exported.text).not.toContain("203.0.113.9");
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
