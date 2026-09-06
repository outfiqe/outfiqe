import { randomUUID } from "node:crypto";

import { addDays } from "date-fns/addDays";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { prisma } from "#db/prisma.js";
import { UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { crmActivitiesRepository } from "#modules/crm-activities/crm-activities.repository.js";
import { seedTenantOrganization } from "#test/integration/crmFixtures.js";
import { ensureProductType } from "#test/integration/productFixtures.js";
import { testApp } from "#test/integration/testApp.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

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

const seedActivitiesTenant = async () => {
  const brand = await prisma.brand.create({
    data: {
      name: `Activity Brand ${randomUUID().slice(0, 6)}`,
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
  const size = await prisma.productSize.create({
    data: { productId: product.id, label: "M", stock: 10 },
  });

  const { organization, adminRole } = await seedTenantOrganization({ linkedBrandId: brand.id });
  const staff = await createUser("Activity Staff", UserRole.ADMIN);
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

  const customer = await createUser("Timeline Shopper", UserRole.CUSTOMER);
  const order = await prisma.order.create({
    data: {
      userId: customer.id,
      fullName: "Timeline Shopper",
      phone: uniquePhone(),
      address: "1 Rd",
      city: "KTM",
      paymentMethod: "COD",
      paymentStatus: "PAID",
      subtotal: 3000,
      deliveryFee: 100,
      total: 3100,
      items: {
        create: {
          productId: product.id,
          sizeId: size.id,
          qty: 2,
          unitPrice: 1500,
          listUnitPrice: 1500,
        },
      },
    },
  });

  return {
    organization,
    staff,
    membership,
    customer,
    order,
    host: `${organization.subdomain}.localhost`,
    auth: authHeaderFor(staff.id),
  };
};

describe("CRM activities & timeline", () => {
  it("logs an activity and merges it with live order history in the timeline", async () => {
    const tenant = await seedActivitiesTenant();

    const logged = await request(testApp)
      .post("/api/crm/activities")
      .set("Host", tenant.host)
      .set("Authorization", tenant.auth)
      .send({
        subjectType: "customer",
        subjectId: tenant.customer.id,
        type: "CALL",
        body: "Discussed the spring restock",
      });
    expect(logged.status).toBe(201);
    expect(logged.body.data.authorName).toBe("Activity Staff");

    const timeline = await request(testApp)
      .get("/api/crm/timeline")
      .query({ subjectType: "customer", subjectId: tenant.customer.id })
      .set("Host", tenant.host)
      .set("Authorization", tenant.auth);

    expect(timeline.status).toBe(200);
    expect(timeline.body.data.partial).toBe(false);
    const kinds = timeline.body.data.entries.map((entry: { kind: string }) => entry.kind);
    expect(kinds).toContain("activity");
    expect(kinds).toContain("order");

    const orderEntry = timeline.body.data.entries.find(
      (entry: { kind: string }) => entry.kind === "order",
    );
    expect(orderEntry.orderId).toBe(tenant.order.id);
    expect(orderEntry.amount).toBe(3000);
  });

  it("returns an activities-only timeline with partial:true when the live merge fails", async () => {
    const tenant = await seedActivitiesTenant();
    await request(testApp)
      .post("/api/crm/activities")
      .set("Host", tenant.host)
      .set("Authorization", tenant.auth)
      .send({
        subjectType: "customer",
        subjectId: tenant.customer.id,
        type: "NOTE",
        body: "left a note",
      });

    const spy = vi
      .spyOn(crmActivitiesRepository, "timelineForSubject")
      .mockRejectedValueOnce(new Error("db blew up"));

    const timeline = await request(testApp)
      .get("/api/crm/timeline")
      .query({ subjectType: "customer", subjectId: tenant.customer.id })
      .set("Host", tenant.host)
      .set("Authorization", tenant.auth);

    expect(timeline.status).toBe(200);
    expect(timeline.body.data.partial).toBe(true);
    expect(
      timeline.body.data.entries.every((entry: { kind: string }) => entry.kind === "activity"),
    ).toBe(true);
    spy.mockRestore();
  });

  it("rejects an activity against a subject that isn't in this CRM", async () => {
    const tenant = await seedActivitiesTenant();
    const stranger = await createUser("Nobody", UserRole.CUSTOMER);

    const response = await request(testApp)
      .post("/api/crm/activities")
      .set("Host", tenant.host)
      .set("Authorization", tenant.auth)
      .send({ subjectType: "customer", subjectId: stranger.id, type: "NOTE", body: "x" });

    expect(response.status).toBe(404);
    expect(response.body.code).toBe("SUBJECT_NOT_FOUND");
  });

  it("logs against a partner and a deal subject, and lists then deletes an activity", async () => {
    const tenant = await seedActivitiesTenant();

    const partner = await createUser("Partner Creator", UserRole.CUSTOMER);
    const product = await prisma.product.findFirstOrThrow({
      where: { brand: { linkedOrganization: { id: tenant.organization.id } } },
    });
    await prisma.creatorLink.create({
      data: {
        creatorId: partner.id,
        productId: product.id,
        token: randomUUID(),
        type: "EXTERNAL_REUSABLE",
      },
    });

    const leadStage = await prisma.pipelineStage.create({
      data: { organizationId: tenant.organization.id, name: "Lead", sortOrder: 0 },
    });
    const deal = await prisma.deal.create({
      data: {
        organizationId: tenant.organization.id,
        stageId: leadStage.id,
        title: "Collab",
        partnerCreatorId: partner.id,
      },
    });

    const partnerActivity = await request(testApp)
      .post("/api/crm/activities")
      .set("Host", tenant.host)
      .set("Authorization", tenant.auth)
      .send({ subjectType: "partner", subjectId: partner.id, type: "EMAIL", body: "sent brief" });
    expect(partnerActivity.status).toBe(201);

    const dealActivity = await request(testApp)
      .post("/api/crm/activities")
      .set("Host", tenant.host)
      .set("Authorization", tenant.auth)
      .send({ subjectType: "deal", subjectId: deal.id, type: "MESSAGE", body: "negotiating" });
    expect(dealActivity.status).toBe(201);

    const list = await request(testApp)
      .get("/api/crm/activities")
      .query({ subjectType: "deal", subjectId: deal.id })
      .set("Host", tenant.host)
      .set("Authorization", tenant.auth);
    expect(list.body.data).toHaveLength(1);

    const deleted = await request(testApp)
      .delete(`/api/crm/activities/${dealActivity.body.data.id}`)
      .set("Host", tenant.host)
      .set("Authorization", tenant.auth);
    expect(deleted.status).toBe(200);

    const missing = await request(testApp)
      .delete(`/api/crm/activities/${randomUUID()}`)
      .set("Host", tenant.host)
      .set("Authorization", tenant.auth);
    expect(missing.status).toBe(404);

    const dealTimeline = await request(testApp)
      .get("/api/crm/timeline")
      .query({ subjectType: "deal", subjectId: deal.id })
      .set("Host", tenant.host)
      .set("Authorization", tenant.auth);
    expect(dealTimeline.status).toBe(200);
    expect(dealTimeline.body.data.partial).toBe(false);
  });
});

describe("CRM tasks", () => {
  it("creates a task, completes it, and stamps completedAt", async () => {
    const tenant = await seedActivitiesTenant();

    const created = await request(testApp)
      .post("/api/crm/tasks")
      .set("Host", tenant.host)
      .set("Authorization", tenant.auth)
      .send({
        title: "Follow up on restock",
        assigneeMembershipId: tenant.membership.id,
        subjectType: "customer",
        subjectId: tenant.customer.id,
      });
    expect(created.status).toBe(201);
    expect(created.body.data.status).toBe("OPEN");
    expect(created.body.data.assigneeName).toBe("Activity Staff");

    const done = await request(testApp)
      .patch(`/api/crm/tasks/${created.body.data.id}`)
      .set("Host", tenant.host)
      .set("Authorization", tenant.auth)
      .send({ status: "DONE" });
    expect(done.status).toBe(200);
    expect(done.body.data.status).toBe("DONE");
    expect(done.body.data.completedAt).not.toBeNull();

    const openOnly = await request(testApp)
      .get("/api/crm/tasks")
      .query({ status: "OPEN" })
      .set("Host", tenant.host)
      .set("Authorization", tenant.auth);
    expect(openOnly.body.data).toEqual([]);
  });

  it("rejects a task assigned to someone outside the organization", async () => {
    const tenant = await seedActivitiesTenant();
    const otherOrg = await seedActivitiesTenant();

    const response = await request(testApp)
      .post("/api/crm/tasks")
      .set("Host", tenant.host)
      .set("Authorization", tenant.auth)
      .send({ title: "bad", assigneeMembershipId: otherOrg.membership.id });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("MEMBERSHIP_NOT_FOUND");
  });

  it("creates a subjectless task, reopens it, filters, and deletes it", async () => {
    const tenant = await seedActivitiesTenant();

    const created = await request(testApp)
      .post("/api/crm/tasks")
      .set("Host", tenant.host)
      .set("Authorization", tenant.auth)
      .send({
        title: "Internal cleanup",
        assigneeMembershipId: tenant.membership.id,
        dueAt: addDays(new Date(), 1).toISOString(),
      });
    expect(created.status).toBe(201);
    expect(created.body.data.partnerCreatorId).toBeNull();

    await request(testApp)
      .patch(`/api/crm/tasks/${created.body.data.id}`)
      .set("Host", tenant.host)
      .set("Authorization", tenant.auth)
      .send({ status: "DONE" });
    const reopened = await request(testApp)
      .patch(`/api/crm/tasks/${created.body.data.id}`)
      .set("Host", tenant.host)
      .set("Authorization", tenant.auth)
      .send({ status: "OPEN" });
    expect(reopened.body.data.completedAt).toBeNull();

    const mine = await request(testApp)
      .get("/api/crm/tasks")
      .query({ assigneeMembershipId: tenant.membership.id })
      .set("Host", tenant.host)
      .set("Authorization", tenant.auth);
    expect(mine.body.data).toHaveLength(1);

    const deleted = await request(testApp)
      .delete(`/api/crm/tasks/${created.body.data.id}`)
      .set("Host", tenant.host)
      .set("Authorization", tenant.auth);
    expect(deleted.status).toBe(200);

    const missing = await request(testApp)
      .delete(`/api/crm/tasks/${randomUUID()}`)
      .set("Host", tenant.host)
      .set("Authorization", tenant.auth);
    expect(missing.status).toBe(404);
  });

  it("keeps tasks isolated between tenants", async () => {
    const tenantA = await seedActivitiesTenant();
    const tenantB = await seedActivitiesTenant();

    const created = await request(testApp)
      .post("/api/crm/tasks")
      .set("Host", tenantA.host)
      .set("Authorization", tenantA.auth)
      .send({ title: "A task", assigneeMembershipId: tenantA.membership.id });

    const crossPatch = await request(testApp)
      .patch(`/api/crm/tasks/${created.body.data.id}`)
      .set("Host", tenantB.host)
      .set("Authorization", tenantB.auth)
      .send({ status: "DONE" });
    expect(crossPatch.status).toBe(404);

    const listB = await request(testApp)
      .get("/api/crm/tasks")
      .set("Host", tenantB.host)
      .set("Authorization", tenantB.auth);
    expect(listB.body.data).toEqual([]);
  });
});
