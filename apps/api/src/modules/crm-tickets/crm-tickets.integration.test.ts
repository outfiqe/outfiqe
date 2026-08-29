import { randomUUID } from "node:crypto";

import { addDays } from "date-fns/addDays";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { prisma } from "#db/prisma.js";
import { eventBus } from "#events/event-bus.js";
import { UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { seedTenantOrganization } from "#test/integration/crmFixtures.js";
import { testApp } from "#test/integration/testApp.js";

const uniquePhone = () => `98${randomUUID().replace(/\D/g, "1").slice(0, 8)}`;

const authHeaderFor = (userId: string) => {
  const { accessToken } = generateTokenpair({ sub: userId, role: UserRole.ADMIN });
  return `Bearer ${accessToken}`;
};

const createUser = (name: string, role: UserRole) =>
  prisma.user.create({
    data: {
      email: `${name.toLowerCase().replace(/\s+/g, "-")}-${randomUUID()}@outfiqe.test`,
      name,
      handle: `${name.toLowerCase().replace(/\s+/g, "-")}-${randomUUID().slice(0, 8)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role,
    },
  });

const seedTicketsTenant = async () => {
  const brand = await prisma.brand.create({
    data: {
      name: `Ticket Brand ${randomUUID().slice(0, 6)}`,
      contactName: "Contact",
      email: `${randomUUID()}@brand.test`,
      phone: uniquePhone(),
      instagram: `@${randomUUID().slice(0, 8)}`,
    },
  });
  const product = await prisma.product.create({
    data: { brandId: brand.id, name: "Tee", price: 1500, type: "TOPS", status: "APPROVED" },
  });
  const size = await prisma.productSize.create({
    data: { productId: product.id, label: "M", stock: 10 },
  });

  const { organization, adminRole } = await seedTenantOrganization({ linkedBrandId: brand.id });
  const staff = await createUser("Ticket Staff", UserRole.ADMIN);
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

  const customer = await createUser("Ticket Shopper", UserRole.CUSTOMER);
  await prisma.order.create({
    data: {
      userId: customer.id,
      fullName: "Ticket Shopper",
      phone: uniquePhone(),
      address: "1 Rd",
      city: "KTM",
      paymentMethod: "COD",
      paymentStatus: "PAID",
      subtotal: 1500,
      deliveryFee: 100,
      total: 1600,
      items: { create: { productId: product.id, sizeId: size.id, qty: 1, unitPrice: 1500 } },
    },
  });

  return {
    organization,
    staff,
    membership,
    customer,
    host: `${organization.subdomain}.localhost`,
    auth: authHeaderFor(staff.id),
  };
};

describe("CRM tickets", () => {
  it("opens a complaint, advances it forward-only, and stamps resolvedAt", async () => {
    const tenant = await seedTicketsTenant();

    const created = await request(testApp)
      .post("/api/crm/tickets")
      .set("Host", tenant.host)
      .set("Authorization", tenant.auth)
      .send({
        type: "COMPLAINT",
        title: "Damaged package",
        description: "Arrived torn",
        subjectType: "customer",
        subjectId: tenant.customer.id,
      });
    expect(created.status).toBe(201);
    expect(created.body.data.status).toBe("OPEN");

    const ticketId = created.body.data.id;

    const skip = await request(testApp)
      .patch(`/api/crm/tickets/${ticketId}/status`)
      .set("Host", tenant.host)
      .set("Authorization", tenant.auth)
      .send({ status: "CLOSED" });
    expect(skip.status).toBe(409);
    expect(skip.body.code).toBe("INVALID_TICKET_TRANSITION");

    for (const status of ["IN_PROGRESS", "RESOLVED", "CLOSED"]) {
      const step = await request(testApp)
        .patch(`/api/crm/tickets/${ticketId}/status`)
        .set("Host", tenant.host)
        .set("Authorization", tenant.auth)
        .send({ status });
      expect(step.status).toBe(200);
      expect(step.body.data.status).toBe(status);
    }

    const finalTicket = await prisma.crmTicket.findUniqueOrThrow({ where: { id: ticketId } });
    expect(finalTicket.resolvedAt).not.toBeNull();
  });

  it("adds an internal comment thread", async () => {
    const tenant = await seedTicketsTenant();
    const created = await request(testApp)
      .post("/api/crm/tickets")
      .set("Host", tenant.host)
      .set("Authorization", tenant.auth)
      .send({
        type: "REQUEST",
        title: "Wants a refund",
        description: "Asked via DM",
        subjectType: "customer",
        subjectId: tenant.customer.id,
      });

    await request(testApp)
      .post(`/api/crm/tickets/${created.body.data.id}/comments`)
      .set("Host", tenant.host)
      .set("Authorization", tenant.auth)
      .send({ body: "Checked the order — eligible." });

    const withComments = await request(testApp)
      .get(`/api/crm/tickets/${created.body.data.id}`)
      .set("Host", tenant.host)
      .set("Authorization", tenant.auth);
    expect(withComments.body.data.comments).toHaveLength(1);
    expect(withComments.body.data.comments[0].authorName).toBe("Ticket Staff");
  });

  it("emits a CRM_ITEM_ASSIGNED event when a ticket is assigned to someone else", async () => {
    const tenant = await seedTicketsTenant();
    const other = await createUser("Assignee", UserRole.ADMIN);
    const memberRole = await prisma.role.findFirstOrThrow({
      where: { organizationId: tenant.organization.id, name: "Member" },
    });
    const otherMembership = await prisma.membership.create({
      data: {
        organizationId: tenant.organization.id,
        userId: other.id,
        roleId: memberRole.id,
        status: "ACTIVE",
      },
    });

    const created = await request(testApp)
      .post("/api/crm/tickets")
      .set("Host", tenant.host)
      .set("Authorization", tenant.auth)
      .send({
        type: "COMPLAINT",
        title: "Late delivery",
        description: "Two weeks late",
        subjectType: "customer",
        subjectId: tenant.customer.id,
      });

    const publishSpy = vi.spyOn(eventBus, "publish").mockResolvedValue(undefined);

    const assigned = await request(testApp)
      .patch(`/api/crm/tickets/${created.body.data.id}/assignee`)
      .set("Host", tenant.host)
      .set("Authorization", tenant.auth)
      .send({ assigneeMembershipId: otherMembership.id });

    expect(assigned.status).toBe(200);
    expect(assigned.body.data.assigneeName).toBe("Assignee");
    expect(publishSpy).toHaveBeenCalledWith(
      "crm.item.assigned",
      expect.objectContaining({
        itemKind: "ticket",
        itemId: created.body.data.id,
        assigneeUserId: other.id,
        assignedByUserId: tenant.staff.id,
      }),
    );
    publishSpy.mockRestore();
  });

  it("rejects a ticket against a subject that isn't in this CRM and isolates tenants", async () => {
    const tenant = await seedTicketsTenant();
    const stranger = await createUser("Outsider", UserRole.CUSTOMER);

    const bad = await request(testApp)
      .post("/api/crm/tickets")
      .set("Host", tenant.host)
      .set("Authorization", tenant.auth)
      .send({
        type: "REQUEST",
        title: "x",
        description: "y",
        subjectType: "customer",
        subjectId: stranger.id,
      });
    expect(bad.status).toBe(404);

    const other = await seedTicketsTenant();
    const created = await request(testApp)
      .post("/api/crm/tickets")
      .set("Host", tenant.host)
      .set("Authorization", tenant.auth)
      .send({
        type: "COMPLAINT",
        title: "mine",
        description: "d",
        subjectType: "customer",
        subjectId: tenant.customer.id,
      });

    const crossGet = await request(testApp)
      .get(`/api/crm/tickets/${created.body.data.id}`)
      .set("Host", other.host)
      .set("Authorization", other.auth);
    expect(crossGet.status).toBe(404);

    const listOther = await request(testApp)
      .get("/api/crm/tickets")
      .set("Host", other.host)
      .set("Authorization", other.auth);
    expect(listOther.body.data).toEqual([]);
  });
});
