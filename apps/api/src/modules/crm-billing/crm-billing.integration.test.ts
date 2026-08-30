import { randomUUID } from "node:crypto";

import { addDays } from "date-fns/addDays";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "#db/prisma.js";
import { UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { seedTenantOrganization } from "#test/integration/crmFixtures.js";
import { testApp } from "#test/integration/testApp.js";

const esewaInitiate = vi.hoisted(() => vi.fn());
const esewaVerify = vi.hoisted(() => vi.fn());
const khaltiInitiate = vi.hoisted(() => vi.fn());
const khaltiVerify = vi.hoisted(() => vi.fn());

vi.mock("#modules/payments/providers/esewa.provider.js", () => ({
  esewaProvider: { initiate: esewaInitiate, verify: esewaVerify },
}));
vi.mock("#modules/payments/providers/khalti.provider.js", () => ({
  khaltiProvider: { initiate: khaltiInitiate, verify: khaltiVerify },
  extractKhaltiTransactionId: () => null,
}));

const FORM_POST_RESULT = {
  mode: "FORM_POST" as const,
  formUrl: "https://pay.example/esewa",
  fields: { amount: "4500" },
  providerRef: "ref-123",
};

const uniquePhone = () => `98${randomUUID().replace(/\D/g, "1").slice(0, 8)}`;

const createTenantStaff = async () =>
  prisma.user.create({
    data: {
      email: `billing-staff-${randomUUID()}@outfiqe.test`,
      name: "Billing Staff",
      handle: `billing-staff-${randomUUID().slice(0, 8)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role: UserRole.ADMIN,
    },
  });

const authHeaderFor = (userId: string) => {
  const { accessToken } = generateTokenpair({ sub: userId, role: UserRole.ADMIN });
  return `Bearer ${accessToken}`;
};

const addActiveMembers = async (organizationId: string, count: number): Promise<void> => {
  const memberRole = await prisma.role.findFirstOrThrow({
    where: { organizationId, name: "Member" },
  });
  for (let index = 0; index < count; index += 1) {
    const member = await createTenantStaff();
    await prisma.membership.create({
      data: { organizationId, userId: member.id, roleId: memberRole.id, status: "ACTIVE" },
    });
  }
};

const setUpTenantWithSuperAdmin = async (trialEndsAt: Date | null = addDays(new Date(), 14)) => {
  const { organization, adminRole } = await seedTenantOrganization();
  await prisma.organization.update({
    where: { id: organization.id },
    data: { trialEndsAt },
  });
  const staff = await createTenantStaff();
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
    data: { superAdminMembershipId: membership.id },
  });

  return { organization, staff, membership, host: `${organization.subdomain}.localhost` };
};

beforeEach(() => {
  vi.clearAllMocks();
  esewaInitiate.mockResolvedValue(FORM_POST_RESULT);
  khaltiInitiate.mockResolvedValue({
    mode: "REDIRECT",
    redirectUrl: "https://pay.example/khalti",
    providerRef: "pidx-1",
  });
});

describe("GET /api/crm/billing", () => {
  it("reports advanced features enabled during an active trial with no subscription", async () => {
    const { staff, host } = await setUpTenantWithSuperAdmin();

    const response = await request(testApp)
      .get("/api/crm/billing")
      .set("Host", host)
      .set("Authorization", authHeaderFor(staff.id));

    expect(response.status).toBe(200);
    expect(response.body.data.subscription).toBeNull();
    expect(response.body.data.advancedFeaturesEnabled).toBe(true);
    expect(response.body.data.planCatalog.length).toBeGreaterThan(0);
  });

  it("reports advanced features disabled once the trial has lapsed and no subscription exists", async () => {
    const { staff, host } = await setUpTenantWithSuperAdmin(addDays(new Date(), -1));

    const response = await request(testApp)
      .get("/api/crm/billing")
      .set("Host", host)
      .set("Authorization", authHeaderFor(staff.id));

    expect(response.status).toBe(200);
    expect(response.body.data.advancedFeaturesEnabled).toBe(false);
  });
});

describe("POST /api/crm/billing/checkout", () => {
  it("opens an invoice and returns the provider redirect", async () => {
    const { organization, staff, host } = await setUpTenantWithSuperAdmin();

    const response = await request(testApp)
      .post("/api/crm/billing/checkout")
      .set("Host", host)
      .set("Authorization", authHeaderFor(staff.id))
      .send({ plan: "starter", seats: 3, provider: "ESEWA" });

    expect(response.status).toBe(200);
    expect(response.body.data.mode).toBe("FORM_POST");
    expect(response.body.data.invoiceId).toBeDefined();
    expect(esewaInitiate).toHaveBeenCalledOnce();

    const subscription = await prisma.subscription.findUniqueOrThrow({
      where: { organizationId: organization.id },
    });
    expect(subscription.plan).toBe("starter");
    expect(subscription.status).toBe("TRIALING");

    const invoice = await prisma.subscriptionInvoice.findUniqueOrThrow({
      where: { id: response.body.data.invoiceId },
    });
    expect(invoice.status).toBe("OPEN");
    expect(invoice.provider).toBe("ESEWA");
    expect(invoice.amount).toBe(2700);
  });

  it("never sells fewer seats than the organization has active members", async () => {
    const { organization, staff, host } = await setUpTenantWithSuperAdmin();
    await addActiveMembers(organization.id, 4);

    const response = await request(testApp)
      .post("/api/crm/billing/checkout")
      .set("Host", host)
      .set("Authorization", authHeaderFor(staff.id))
      .send({ plan: "starter", seats: 1, provider: "ESEWA" });

    expect(response.status).toBe(200);
    const invoice = await prisma.subscriptionInvoice.findUniqueOrThrow({
      where: { id: response.body.data.invoiceId },
    });
    expect(invoice.seats).toBe(5);

    const subscription = await prisma.subscription.findUniqueOrThrow({
      where: { organizationId: organization.id },
    });
    expect(subscription.seats).toBe(5);
  });

  it("returns a Khalti redirect when that gateway is chosen", async () => {
    const { staff, host } = await setUpTenantWithSuperAdmin();

    const response = await request(testApp)
      .post("/api/crm/billing/checkout")
      .set("Host", host)
      .set("Authorization", authHeaderFor(staff.id))
      .send({ plan: "starter", seats: 2, provider: "KHALTI" });

    expect(response.status).toBe(200);
    expect(response.body.data.mode).toBe("REDIRECT");
    expect(response.body.data.redirectUrl).toContain("khalti");
    expect(khaltiInitiate).toHaveBeenCalledOnce();
  });

  it("voids the invoice and returns a safe error when the gateway is unreachable", async () => {
    const { organization, staff, host } = await setUpTenantWithSuperAdmin();
    esewaInitiate.mockRejectedValue(new Error("ECONNREFUSED esewa.example"));

    const response = await request(testApp)
      .post("/api/crm/billing/checkout")
      .set("Host", host)
      .set("Authorization", authHeaderFor(staff.id))
      .send({ plan: "starter", seats: 2, provider: "ESEWA" });

    expect(response.status).toBe(502);
    expect(response.body.code).toBe("BILLING_PROVIDER_UNAVAILABLE");
    expect(JSON.stringify(response.body)).not.toMatch(/ECONNREFUSED|esewa\.example/);

    const invoices = await prisma.subscriptionInvoice.findMany({
      where: { subscription: { organizationId: organization.id } },
    });
    expect(invoices).toHaveLength(1);
    expect(invoices[0]?.status).toBe("VOID");
  });

  it("rejects an unknown plan", async () => {
    const { staff, host } = await setUpTenantWithSuperAdmin();

    const response = await request(testApp)
      .post("/api/crm/billing/checkout")
      .set("Host", host)
      .set("Authorization", authHeaderFor(staff.id))
      .send({ plan: "enterprise", seats: 2, provider: "ESEWA" });

    expect(response.status).toBe(422);
  });

  it("rejects a member without billing:manage", async () => {
    const { organization, host } = await setUpTenantWithSuperAdmin();
    const memberRole = await prisma.role.findFirstOrThrow({
      where: { organizationId: organization.id, name: "Member" },
    });
    const plainMember = await createTenantStaff();
    await prisma.membership.create({
      data: {
        organizationId: organization.id,
        userId: plainMember.id,
        roleId: memberRole.id,
        status: "ACTIVE",
      },
    });

    const response = await request(testApp)
      .post("/api/crm/billing/checkout")
      .set("Host", host)
      .set("Authorization", authHeaderFor(plainMember.id))
      .send({ plan: "starter", seats: 3, provider: "ESEWA" });

    expect(response.status).toBe(403);
  });
});

describe("POST /api/crm/billing/invoices/:invoiceId/verify", () => {
  const startCheckout = async (host: string, userId: string) => {
    const response = await request(testApp)
      .post("/api/crm/billing/checkout")
      .set("Host", host)
      .set("Authorization", authHeaderFor(userId))
      .send({ plan: "starter", seats: 2, provider: "ESEWA" });
    return response.body.data.invoiceId as string;
  };

  it("activates the subscription when the provider confirms the charge", async () => {
    const { organization, staff, host } = await setUpTenantWithSuperAdmin();
    const invoiceId = await startCheckout(host, staff.id);
    esewaVerify.mockResolvedValue({ status: "COMPLETE", rawResponse: { status: "COMPLETE" } });

    const response = await request(testApp)
      .post(`/api/crm/billing/invoices/${invoiceId}/verify`)
      .set("Host", host)
      .set("Authorization", authHeaderFor(staff.id));

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("COMPLETE");

    const invoice = await prisma.subscriptionInvoice.findUniqueOrThrow({
      where: { id: invoiceId },
    });
    expect(invoice.status).toBe("PAID");
    expect(invoice.paidAt).not.toBeNull();

    const subscription = await prisma.subscription.findUniqueOrThrow({
      where: { organizationId: organization.id },
    });
    expect(subscription.status).toBe("ACTIVE");
    expect(subscription.currentPeriodEnd.getTime()).toBe(invoice.periodEnd.getTime());
  });

  it("voids the invoice and leaves the subscription trialing when the charge fails", async () => {
    const { organization, staff, host } = await setUpTenantWithSuperAdmin();
    const invoiceId = await startCheckout(host, staff.id);
    esewaVerify.mockResolvedValue({ status: "FAILED", rawResponse: { status: "CANCELED" } });

    const response = await request(testApp)
      .post(`/api/crm/billing/invoices/${invoiceId}/verify`)
      .set("Host", host)
      .set("Authorization", authHeaderFor(staff.id));

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("FAILED");

    const invoice = await prisma.subscriptionInvoice.findUniqueOrThrow({
      where: { id: invoiceId },
    });
    expect(invoice.status).toBe("VOID");

    const subscription = await prisma.subscription.findUniqueOrThrow({
      where: { organizationId: organization.id },
    });
    expect(subscription.status).toBe("TRIALING");
  });

  it("404s for an invoice that belongs to another tenant", async () => {
    const first = await setUpTenantWithSuperAdmin();
    const invoiceId = await startCheckout(first.host, first.staff.id);

    const second = await setUpTenantWithSuperAdmin();
    const response = await request(testApp)
      .post(`/api/crm/billing/invoices/${invoiceId}/verify`)
      .set("Host", second.host)
      .set("Authorization", authHeaderFor(second.staff.id));

    expect(response.status).toBe(404);
  });

  it("is idempotent once the invoice is already paid", async () => {
    const { staff, host } = await setUpTenantWithSuperAdmin();
    const invoiceId = await startCheckout(host, staff.id);
    esewaVerify.mockResolvedValue({ status: "COMPLETE", rawResponse: {} });

    await request(testApp)
      .post(`/api/crm/billing/invoices/${invoiceId}/verify`)
      .set("Host", host)
      .set("Authorization", authHeaderFor(staff.id));

    esewaVerify.mockClear();
    const second = await request(testApp)
      .post(`/api/crm/billing/invoices/${invoiceId}/verify`)
      .set("Host", host)
      .set("Authorization", authHeaderFor(staff.id));

    expect(second.status).toBe(200);
    expect(second.body.data.status).toBe("COMPLETE");
    expect(esewaVerify).not.toHaveBeenCalled();
  });
});

describe("POST /api/crm/billing/invoices/:invoiceId/pay", () => {
  it("initiates payment against an existing open renewal invoice", async () => {
    const { organization, staff, host } = await setUpTenantWithSuperAdmin();
    const subscription = await prisma.subscription.create({
      data: {
        organizationId: organization.id,
        plan: "starter",
        status: "PAST_DUE",
        seats: 2,
        currentPeriodEnd: addDays(new Date(), -1),
      },
    });
    const renewalInvoice = await prisma.subscriptionInvoice.create({
      data: {
        subscriptionId: subscription.id,
        plan: "starter",
        seats: 2,
        amount: 1800,
        status: "OPEN",
        periodStart: new Date(),
        periodEnd: addDays(new Date(), 30),
      },
    });

    const response = await request(testApp)
      .post(`/api/crm/billing/invoices/${renewalInvoice.id}/pay`)
      .set("Host", host)
      .set("Authorization", authHeaderFor(staff.id))
      .send({ provider: "ESEWA" });

    expect(response.status).toBe(200);
    expect(response.body.data.mode).toBe("FORM_POST");
    const updated = await prisma.subscriptionInvoice.findUniqueOrThrow({
      where: { id: renewalInvoice.id },
    });
    expect(updated.provider).toBe("ESEWA");
    expect(updated.initiatedAt).not.toBeNull();
  });

  it("404s for an unknown invoice", async () => {
    const { staff, host } = await setUpTenantWithSuperAdmin();

    const response = await request(testApp)
      .post(`/api/crm/billing/invoices/${randomUUID()}/pay`)
      .set("Host", host)
      .set("Authorization", authHeaderFor(staff.id))
      .send({ provider: "ESEWA" });

    expect(response.status).toBe(404);
  });
});

describe("POST /api/crm/billing/cancel", () => {
  it("marks an active subscription not to renew", async () => {
    const { organization, staff, host } = await setUpTenantWithSuperAdmin();
    await prisma.subscription.create({
      data: {
        organizationId: organization.id,
        plan: "starter",
        status: "ACTIVE",
        seats: 2,
        currentPeriodEnd: addDays(new Date(), 20),
      },
    });

    const response = await request(testApp)
      .post("/api/crm/billing/cancel")
      .set("Host", host)
      .set("Authorization", authHeaderFor(staff.id));

    expect(response.status).toBe(200);
    const subscription = await prisma.subscription.findUniqueOrThrow({
      where: { organizationId: organization.id },
    });
    expect(subscription.cancelAtPeriodEnd).toBe(true);
  });

  it("409s when there is no subscription to cancel", async () => {
    const { staff, host } = await setUpTenantWithSuperAdmin();

    const response = await request(testApp)
      .post("/api/crm/billing/cancel")
      .set("Host", host)
      .set("Authorization", authHeaderFor(staff.id));

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("NO_ACTIVE_SUBSCRIPTION");
  });
});

describe("GET /api/crm/billing/invoices", () => {
  it("cursor-paginates the invoice history newest first", async () => {
    const { organization, staff, host } = await setUpTenantWithSuperAdmin();
    const subscription = await prisma.subscription.create({
      data: {
        organizationId: organization.id,
        plan: "starter",
        status: "ACTIVE",
        seats: 1,
        currentPeriodEnd: addDays(new Date(), 20),
      },
    });
    for (let index = 0; index < 3; index += 1) {
      await prisma.subscriptionInvoice.create({
        data: {
          subscriptionId: subscription.id,
          plan: "starter",
          seats: 1,
          amount: 900,
          status: "PAID",
          periodStart: addDays(new Date(), index * 30),
          periodEnd: addDays(new Date(), (index + 1) * 30),
        },
      });
    }

    const firstPage = await request(testApp)
      .get("/api/crm/billing/invoices")
      .query({ limit: 2 })
      .set("Host", host)
      .set("Authorization", authHeaderFor(staff.id));

    expect(firstPage.status).toBe(200);
    expect(firstPage.body.data.invoices).toHaveLength(2);
    expect(firstPage.body.data.nextCursor).toBeDefined();

    const secondPage = await request(testApp)
      .get("/api/crm/billing/invoices")
      .query({ limit: 2, cursor: firstPage.body.data.nextCursor })
      .set("Host", host)
      .set("Authorization", authHeaderFor(staff.id));

    expect(secondPage.body.data.invoices).toHaveLength(1);
    expect(secondPage.body.data.nextCursor).toBeNull();
  });
});
