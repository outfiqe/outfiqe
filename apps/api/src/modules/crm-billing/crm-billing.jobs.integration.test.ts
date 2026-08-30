import { randomUUID } from "node:crypto";

import { addDays } from "date-fns/addDays";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "#db/prisma.js";
import { seedTenantOrganization } from "#test/integration/crmFixtures.js";

import {
  runCrmBillingReconciliationSweep,
  runCrmSubscriptionRenewalSweep,
} from "./crm-billing.jobs.js";

const esewaVerify = vi.hoisted(() => vi.fn());

vi.mock("#modules/payments/providers/esewa.provider.js", () => ({
  esewaProvider: { initiate: vi.fn(), verify: esewaVerify },
}));
vi.mock("#modules/payments/providers/khalti.provider.js", () => ({
  khaltiProvider: { initiate: vi.fn(), verify: vi.fn() },
  extractKhaltiTransactionId: () => null,
}));

const createActiveSubscription = async (currentPeriodEnd: Date) => {
  const { organization, adminRole } = await seedTenantOrganization();
  const staff = await prisma.user.create({
    data: {
      email: `renewal-${randomUUID()}@outfiqe.test`,
      name: "Renewal Owner",
      handle: `renewal-${randomUUID().slice(0, 8)}`,
      phone: `98${randomUUID().replace(/\D/g, "1").slice(0, 8)}`,
      passwordHash: "not-used-in-tests",
      role: "ADMIN",
    },
  });
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

  const subscription = await prisma.subscription.create({
    data: {
      organizationId: organization.id,
      plan: "starter",
      status: "ACTIVE",
      seats: 3,
      currentPeriodEnd,
    },
  });

  return { organization, subscription };
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("runCrmSubscriptionRenewalSweep", () => {
  it("opens a renewal invoice for a subscription inside the lookahead window", async () => {
    const { subscription } = await createActiveSubscription(addDays(new Date(), 2));

    const result = await runCrmSubscriptionRenewalSweep();

    expect(result.invoicesOpened).toBeGreaterThanOrEqual(1);
    const invoice = await prisma.subscriptionInvoice.findFirstOrThrow({
      where: { subscriptionId: subscription.id, status: "OPEN" },
    });
    expect(invoice.amount).toBe(2700);
    expect(invoice.provider).toBeNull();
  });

  it("moves a lapsed subscription to PAST_DUE and cancels it past the grace window", async () => {
    const lapsed = await createActiveSubscription(addDays(new Date(), -1));
    await runCrmSubscriptionRenewalSweep();
    const afterFirst = await prisma.subscription.findUniqueOrThrow({
      where: { id: lapsed.subscription.id },
    });
    expect(afterFirst.status).toBe("PAST_DUE");

    await prisma.subscription.update({
      where: { id: lapsed.subscription.id },
      data: { currentPeriodEnd: addDays(new Date(), -30) },
    });
    await prisma.subscriptionInvoice.updateMany({
      where: { subscriptionId: lapsed.subscription.id },
      data: { status: "VOID" },
    });

    await runCrmSubscriptionRenewalSweep();
    const afterGrace = await prisma.subscription.findUniqueOrThrow({
      where: { id: lapsed.subscription.id },
    });
    expect(afterGrace.status).toBe("CANCELED");
  });
});

describe("runCrmBillingReconciliationSweep", () => {
  it("settles an invoice the provider now confirms as paid", async () => {
    const { organization, subscription } = await createActiveSubscription(addDays(new Date(), 20));
    const periodEnd = addDays(new Date(), 45);
    const pendingInvoice = await prisma.subscriptionInvoice.create({
      data: {
        subscriptionId: subscription.id,
        plan: "starter",
        seats: 3,
        amount: 2700,
        status: "OPEN",
        periodStart: new Date(),
        periodEnd,
        provider: "ESEWA",
        initiatedAt: new Date(Date.now() - 10 * 60 * 1000),
      },
    });
    esewaVerify.mockResolvedValue({ status: "COMPLETE", rawResponse: { status: "COMPLETE" } });

    const result = await runCrmBillingReconciliationSweep();

    expect(result.settled).toBeGreaterThanOrEqual(1);
    const invoice = await prisma.subscriptionInvoice.findUniqueOrThrow({
      where: { id: pendingInvoice.id },
    });
    expect(invoice.status).toBe("PAID");
    const activated = await prisma.subscription.findUniqueOrThrow({
      where: { organizationId: organization.id },
    });
    expect(activated.status).toBe("ACTIVE");
    expect(activated.currentPeriodEnd.getTime()).toBe(periodEnd.getTime());
  });

  it("voids an open invoice that has been initiated for longer than the expiry window", async () => {
    const { subscription } = await createActiveSubscription(addDays(new Date(), 20));
    const staleInvoice = await prisma.subscriptionInvoice.create({
      data: {
        subscriptionId: subscription.id,
        plan: "starter",
        seats: 3,
        amount: 2700,
        status: "OPEN",
        periodStart: new Date(),
        periodEnd: addDays(new Date(), 30),
        provider: "ESEWA",
        initiatedAt: addDays(new Date(), -1),
      },
    });

    const result = await runCrmBillingReconciliationSweep();

    expect(result.expired).toBeGreaterThanOrEqual(1);
    const invoice = await prisma.subscriptionInvoice.findUniqueOrThrow({
      where: { id: staleInvoice.id },
    });
    expect(invoice.status).toBe("VOID");
  });
});
