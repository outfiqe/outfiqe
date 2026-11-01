import { randomUUID } from "node:crypto";

import { addDays } from "date-fns/addDays";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { CrmTicketStatus, CrmTicketType, UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { crmAccessRepository } from "#modules/crm-access/crm-access.repository.js";
import { seedTenantOrganization } from "#test/integration/crm-fixtures.js";
import { ensureProductType } from "#test/integration/product-fixtures.js";
import { testApp } from "#test/integration/test-app.js";
import { uniquePhone } from "#test/integration/unique-values.js";

const authHeaderFor = (userId: string) => {
  const { accessToken } = generateTokenpair({ sub: userId, role: UserRole.ADMIN });
  return `Bearer ${accessToken}`;
};

const createUser = (name: string, role: UserRole) =>
  prisma.user.create({
    data: {
      email: `${randomUUID()}@outfiqe.test`,
      name,
      handle: `user-${randomUUID().slice(0, 8)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role,
    },
  });

const seedConnectedTenant = async () => {
  const brand = await prisma.brand.create({
    data: {
      name: `Connected Brand ${randomUUID().slice(0, 6)}`,
      contactName: "Contact",
      email: `${randomUUID()}@brand.test`,
      phone: uniquePhone(),
      instagram: `@${randomUUID().slice(0, 8)}`,
    },
  });
  const product = await prisma.product.create({
    data: {
      brandId: brand.id,
      name: "Tee",
      price: 1500,
      productTypeId: await ensureProductType(),
      status: "APPROVED",
    },
  });
  const { organization, adminRole } = await seedTenantOrganization({ linkedBrandId: brand.id });
  const staff = await createUser("Connected Staff", UserRole.ADMIN);
  const membership = await prisma.membership.create({
    data: {
      organizationId: organization.id,
      userId: staff.id,
      roleId: adminRole.id,
      status: "ACTIVE",
    },
  });
  await prisma.organization.update({
    where: { id: organization.id },
    data: { superAdminMembershipId: membership.id, trialEndsAt: addDays(new Date(), 10) },
  });

  const partner = await createUser("Connected Muse", UserRole.CUSTOMER);
  const look = await prisma.creatorLook.create({
    data: { creatorId: partner.id, imageUrl: "https://img.test/look.jpg" },
  });
  await prisma.creatorLookProduct.create({
    data: { creatorLookId: look.id, productId: product.id },
  });

  const stage = await prisma.pipelineStage.create({
    data: { organizationId: organization.id, name: "Lead", sortOrder: 0 },
  });
  const deal = await prisma.deal.create({
    data: {
      organizationId: organization.id,
      stageId: stage.id,
      title: "Spring collab",
      value: 5000,
      partnerCreatorId: partner.id,
    },
  });
  const contact = await prisma.contact.create({
    data: { organizationId: organization.id, name: "Muse Manager", linkedUserId: partner.id },
  });
  const ticket = await prisma.crmTicket.create({
    data: {
      organizationId: organization.id,
      type: CrmTicketType.COMPLAINT,
      status: CrmTicketStatus.OPEN,
      title: "Late payout",
      description: "x",
      partnerCreatorId: partner.id,
    },
  });
  const task = await prisma.crmTask.create({
    data: {
      organizationId: organization.id,
      title: "Send the brief",
      dueAt: addDays(new Date(), 1),
      assigneeMembershipId: membership.id,
      dealId: deal.id,
    },
  });

  return {
    organization,
    staff,
    partner,
    deal,
    contact,
    ticket,
    task,
    host: `${organization.subdomain}.localhost`,
    auth: authHeaderFor(staff.id),
  };
};

type ConnectedTenant = Awaited<ReturnType<typeof seedConnectedTenant>>;

const getConnections = (
  tenant: Pick<ConnectedTenant, "host" | "auth">,
  subjectType: string,
  subjectId: string,
) =>
  request(testApp)
    .get("/api/crm/connections")
    .query({ subjectType, subjectId })
    .set("Host", tenant.host)
    .set("Authorization", tenant.auth);

const toIds = (rows: { id: string }[]) => rows.map(({ id }) => id);

describe("GET /api/crm/connections", () => {
  it("links an opportunity to its partner, contact, ticket and task, not to itself", async () => {
    const tenant = await seedConnectedTenant();

    const { status, body } = await getConnections(tenant, "deal", tenant.deal.id);

    expect(status).toBe(200);
    expect(body.data.people).toEqual([
      {
        userId: tenant.partner.id,
        name: "Connected Muse",
        handle: tenant.partner.handle,
        avatarUrl: null,
        role: "partner",
      },
    ]);
    expect(toIds(body.data.contacts)).toEqual([tenant.contact.id]);
    expect(toIds(body.data.tickets)).toEqual([tenant.ticket.id]);
    expect(toIds(body.data.tasks)).toEqual([tenant.task.id]);
    expect(body.data.deals).toEqual([]);
  });

  it("links both ways, from a contact and a ticket back to the opportunity", async () => {
    const tenant = await seedConnectedTenant();

    const fromContact = await getConnections(tenant, "contact", tenant.contact.id);
    expect(toIds(fromContact.body.data.deals)).toEqual([tenant.deal.id]);
    expect(fromContact.body.data.contacts).toEqual([]);

    const fromTicket = await getConnections(tenant, "ticket", tenant.ticket.id);
    expect(toIds(fromTicket.body.data.deals)).toEqual([tenant.deal.id]);
    expect(fromTicket.body.data.tickets).toEqual([]);
  });

  it("does not list a partner as connected to themselves", async () => {
    const tenant = await seedConnectedTenant();

    const { body } = await getConnections(tenant, "partner", tenant.partner.id);

    expect(body.data.people).toEqual([]);
    expect(toIds(body.data.deals)).toEqual([tenant.deal.id]);
  });

  it("hides finished tasks", async () => {
    const tenant = await seedConnectedTenant();
    await prisma.crmTask.update({ where: { id: tenant.task.id }, data: { status: "DONE" } });

    const { body } = await getConnections(tenant, "deal", tenant.deal.id);

    expect(body.data.tasks).toEqual([]);
  });

  it("leaves a contact with no linked account with empty lists", async () => {
    const tenant = await seedConnectedTenant();
    const contact = await prisma.contact.create({
      data: { organizationId: tenant.organization.id, name: "Walk-in Contact" },
    });

    const { status, body } = await getConnections(tenant, "contact", contact.id);

    expect(status).toBe(200);
    expect(body.data).toEqual({ people: [], contacts: [], deals: [], tickets: [], tasks: [] });
  });

  it("never shows a linked account's name when they aren't part of this CRM", async () => {
    const tenant = await seedConnectedTenant();
    const stranger = await createUser("Unrelated Person", UserRole.CUSTOMER);
    const contact = await prisma.contact.create({
      data: {
        organizationId: tenant.organization.id,
        name: "Linked Stranger",
        linkedUserId: stranger.id,
      },
    });

    const { body } = await getConnections(tenant, "contact", contact.id);

    expect(body.data.people).toEqual([]);
  });

  it("returns 404 for another tenant's records", async () => {
    const owner = await seedConnectedTenant();
    const other = await seedConnectedTenant();

    for (const [subjectType, subjectId] of [
      ["deal", owner.deal.id],
      ["contact", owner.contact.id],
      ["ticket", owner.ticket.id],
      ["partner", owner.partner.id],
    ] as const) {
      const { status } = await getConnections(other, subjectType, subjectId);
      expect(status).toBe(404);
    }
  });

  it("leaves out what the viewer may not read", async () => {
    const tenant = await seedConnectedTenant();
    const limitedRole = await crmAccessRepository.createRole({
      organizationId: tenant.organization.id,
      name: "Support only",
      permissionKeys: ["org:read", "tickets:read"],
    });
    const agent = await createUser("Support Agent", UserRole.ADMIN);
    await prisma.membership.create({
      data: {
        organizationId: tenant.organization.id,
        userId: agent.id,
        roleId: limitedRole.id,
        status: "ACTIVE",
      },
    });
    const agentSession = { host: tenant.host, auth: authHeaderFor(agent.id) };

    const { body } = await getConnections(agentSession, "ticket", tenant.ticket.id);
    expect(body.data).toEqual({
      people: [],
      contacts: null,
      deals: null,
      tickets: [],
      tasks: null,
    });

    const forbidden = await getConnections(agentSession, "deal", tenant.deal.id);
    expect(forbidden.status).toBe(403);
  });

  it("rejects a subject type it doesn't know", async () => {
    const tenant = await seedConnectedTenant();

    const { status } = await getConnections(tenant, "invoice", tenant.deal.id);

    expect(status).toBe(422);
  });
});
