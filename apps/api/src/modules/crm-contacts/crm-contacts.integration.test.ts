import { randomUUID } from "node:crypto";

import { addDays } from "date-fns/addDays";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { seedTenantOrganization } from "#test/integration/crmFixtures.js";
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

const seedContactsTenant = async () => {
  const brand = await prisma.brand.create({
    data: {
      name: `Contacts Brand ${randomUUID().slice(0, 6)}`,
      contactName: "Contact",
      email: `${randomUUID()}@brand.test`,
      phone: uniquePhone(),
      instagram: `@${randomUUID().slice(0, 8)}`,
    },
  });

  const { organization, adminRole, memberRole } = await seedTenantOrganization({
    linkedBrandId: brand.id,
  });

  const staff = await createUser("Contacts Staff", UserRole.ADMIN);
  const staffMembership = await prisma.membership.create({
    data: {
      organizationId: organization.id,
      userId: staff.id,
      roleId: adminRole.id,
      status: "ACTIVE",
    },
  });
  await prisma.organization.update({
    where: { id: organization.id },
    data: { superAdminMembershipId: staffMembership.id, trialEndsAt: addDays(new Date(), 10) },
  });

  const member = await createUser("Contacts Member", UserRole.ADMIN);
  await prisma.membership.create({
    data: {
      organizationId: organization.id,
      userId: member.id,
      roleId: memberRole.id,
      status: "ACTIVE",
    },
  });

  return {
    organization,
    staffMembership,
    host: `${organization.subdomain}.localhost`,
    auth: authHeaderFor(staff.id),
    memberAuth: authHeaderFor(member.id),
  };
};

const createContact = (
  tenant: Awaited<ReturnType<typeof seedContactsTenant>>,
  body: Record<string, unknown>,
) =>
  request(testApp)
    .post("/api/crm/contacts")
    .set("Host", tenant.host)
    .set("Authorization", tenant.auth)
    .send(body);

describe("CRM contacts", () => {
  it("creates a contact, lists it, and reads it back", async () => {
    const tenant = await seedContactsTenant();

    const created = await createContact(tenant, {
      name: "Anisha Gurung",
      email: "anisha@boutique.test",
      company: "Boutique KTM",
      lifecycleStage: "QUALIFIED",
      tags: ["wholesale", "kathmandu"],
      ownerMembershipId: tenant.staffMembership.id,
    });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({
      name: "Anisha Gurung",
      lifecycleStage: "QUALIFIED",
      ownerName: "Contacts Staff",
    });

    const contactId = created.body.data.id;

    const list = await request(testApp)
      .get("/api/crm/contacts")
      .set("Host", tenant.host)
      .set("Authorization", tenant.auth);
    expect(list.status).toBe(200);
    expect(list.body.data.total).toBe(1);
    expect(list.body.data.items[0].id).toBe(contactId);

    const detail = await request(testApp)
      .get(`/api/crm/contacts/${contactId}`)
      .set("Host", tenant.host)
      .set("Authorization", tenant.auth);
    expect(detail.status).toBe(200);
    expect(detail.body.data.tags).toEqual(["wholesale", "kathmandu"]);
  });

  it("filters by lifecycle stage and search term", async () => {
    const tenant = await seedContactsTenant();
    await createContact(tenant, { name: "Lead One", lifecycleStage: "LEAD" });
    await createContact(tenant, {
      name: "Customer Two",
      company: "Acme",
      lifecycleStage: "CUSTOMER",
    });

    const byStage = await request(testApp)
      .get("/api/crm/contacts?lifecycleStage=CUSTOMER")
      .set("Host", tenant.host)
      .set("Authorization", tenant.auth);
    expect(byStage.body.data.items.map((c: { name: string }) => c.name)).toEqual(["Customer Two"]);

    const bySearch = await request(testApp)
      .get("/api/crm/contacts?q=acme")
      .set("Host", tenant.host)
      .set("Authorization", tenant.auth);
    expect(bySearch.body.data.items.map((c: { name: string }) => c.name)).toEqual(["Customer Two"]);
  });

  it("rejects a duplicate email inside the same organization", async () => {
    const tenant = await seedContactsTenant();
    await createContact(tenant, { name: "First", email: "dupe@x.test" });

    const second = await createContact(tenant, { name: "Second", email: "dupe@x.test" });
    expect(second.status).toBe(409);
    expect(second.body.code).toBe("CONTACT_EMAIL_TAKEN");
  });

  it("rejects an owner membership from another organization", async () => {
    const tenant = await seedContactsTenant();
    const otherTenant = await seedContactsTenant();

    const res = await createContact(tenant, {
      name: "Bad Owner",
      ownerMembershipId: otherTenant.staffMembership.id,
    });
    expect(res.status).toBe(404);
    expect(res.body.code).toBe("OWNER_NOT_FOUND");
  });

  it("rejects a linked user that doesn't exist", async () => {
    const tenant = await seedContactsTenant();
    const res = await createContact(tenant, { name: "Ghost Link", linkedUserId: randomUUID() });
    expect(res.status).toBe(404);
    expect(res.body.code).toBe("LINKED_USER_NOT_FOUND");
  });

  it("updates and deletes a contact", async () => {
    const tenant = await seedContactsTenant();
    const created = await createContact(tenant, { name: "Editable", lifecycleStage: "LEAD" });
    const contactId = created.body.data.id;

    const updated = await request(testApp)
      .patch(`/api/crm/contacts/${contactId}`)
      .set("Host", tenant.host)
      .set("Authorization", tenant.auth)
      .send({ lifecycleStage: "CUSTOMER", notes: "Signed for the season" });
    expect(updated.status).toBe(200);
    expect(updated.body.data.lifecycleStage).toBe("CUSTOMER");

    const removed = await request(testApp)
      .delete(`/api/crm/contacts/${contactId}`)
      .set("Host", tenant.host)
      .set("Authorization", tenant.auth);
    expect(removed.status).toBe(200);

    const gone = await request(testApp)
      .get(`/api/crm/contacts/${contactId}`)
      .set("Host", tenant.host)
      .set("Authorization", tenant.auth);
    expect(gone.status).toBe(404);
  });

  it("keeps contacts isolated between tenants", async () => {
    const tenant = await seedContactsTenant();
    const otherTenant = await seedContactsTenant();
    const created = await createContact(tenant, { name: "Private" });
    const contactId = created.body.data.id;

    const crossRead = await request(testApp)
      .get(`/api/crm/contacts/${contactId}`)
      .set("Host", otherTenant.host)
      .set("Authorization", otherTenant.auth);
    expect(crossRead.status).toBe(404);

    const otherList = await request(testApp)
      .get("/api/crm/contacts")
      .set("Host", otherTenant.host)
      .set("Authorization", otherTenant.auth);
    expect(otherList.body.data.total).toBe(0);
  });

  it("gates delete behind contacts:delete", async () => {
    const tenant = await seedContactsTenant();
    const created = await createContact(tenant, { name: "Member Cannot Delete" });
    const contactId = created.body.data.id;

    const memberDelete = await request(testApp)
      .delete(`/api/crm/contacts/${contactId}`)
      .set("Host", tenant.host)
      .set("Authorization", tenant.memberAuth);
    expect(memberDelete.status).toBe(403);

    const memberCreate = await request(testApp)
      .post("/api/crm/contacts")
      .set("Host", tenant.host)
      .set("Authorization", tenant.memberAuth)
      .send({ name: "Member Can Create" });
    expect(memberCreate.status).toBe(201);
  });
});
