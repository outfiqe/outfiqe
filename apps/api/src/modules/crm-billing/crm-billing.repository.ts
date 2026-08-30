import { addDays } from "date-fns/addDays";

import { prisma } from "#db/prisma.js";
import {
  type CrmBillingProvider,
  SubscriptionInvoiceStatus,
  SubscriptionStatus,
} from "#generated/prisma/enums.js";

import { PAST_DUE_GRACE_DAYS } from "./crm-billing.constants.js";
import type {
  CreateInvoiceInput,
  RenewalOrganization,
  SubscriptionInvoiceRecord,
  SubscriptionRecord,
} from "./crm-billing.types.js";
import { toSubscriptionInvoiceRecord } from "./crm-billing.utils.js";

const invoiceRecordSelect = {
  id: true,
  subscriptionId: true,
  plan: true,
  seats: true,
  amount: true,
  status: true,
  periodStart: true,
  periodEnd: true,
  provider: true,
  providerRef: true,
  initiatedAt: true,
  paidAt: true,
  voidedAt: true,
  createdAt: true,
} as const;

export const crmBillingRepository = {
  async findSubscriptionByOrganizationId(
    organizationId: string,
  ): Promise<SubscriptionRecord | null> {
    return prisma.subscription.findUnique({ where: { organizationId } });
  },

  async upsertSubscriptionPlan(input: {
    organizationId: string;
    plan: string;
    seats: number;
    fallbackCurrentPeriodEnd: Date;
  }): Promise<SubscriptionRecord> {
    return prisma.subscription.upsert({
      where: { organizationId: input.organizationId },
      update: { plan: input.plan, seats: input.seats },
      create: {
        organizationId: input.organizationId,
        plan: input.plan,
        seats: input.seats,
        status: SubscriptionStatus.TRIALING,
        currentPeriodEnd: input.fallbackCurrentPeriodEnd,
      },
    });
  },

  async createInvoice(input: CreateInvoiceInput): Promise<SubscriptionInvoiceRecord> {
    const invoice = await prisma.subscriptionInvoice.create({
      data: {
        subscriptionId: input.subscriptionId,
        plan: input.plan,
        seats: input.seats,
        amount: input.amount,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        status: SubscriptionInvoiceStatus.OPEN,
      },
      select: invoiceRecordSelect,
    });
    return toSubscriptionInvoiceRecord(invoice);
  },

  async markInvoiceInitiated(
    invoiceId: string,
    provider: CrmBillingProvider,
    providerRef: string | null,
  ): Promise<void> {
    await prisma.subscriptionInvoice.update({
      where: { id: invoiceId },
      data: { provider, initiatedAt: new Date(), providerRef },
    });
  },

  async findInvoiceForOrganization(
    organizationId: string,
    invoiceId: string,
  ): Promise<SubscriptionInvoiceRecord | null> {
    const invoice = await prisma.subscriptionInvoice.findFirst({
      where: { id: invoiceId, subscription: { organizationId } },
      select: invoiceRecordSelect,
    });
    return invoice ? toSubscriptionInvoiceRecord(invoice) : null;
  },

  async listInvoicesForOrganization(
    organizationId: string,
    params: { cursor?: string; limit: number },
  ): Promise<SubscriptionInvoiceRecord[]> {
    const invoices = await prisma.subscriptionInvoice.findMany({
      where: { subscription: { organizationId } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: params.limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      select: invoiceRecordSelect,
    });
    return invoices.map(toSubscriptionInvoiceRecord);
  },

  async settleInvoiceAsPaid(
    invoiceId: string,
    rawResponse: unknown,
    period: { plan: string; seats: number; currentPeriodEnd: Date },
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.subscriptionInvoice.updateMany({
        where: { id: invoiceId, status: SubscriptionInvoiceStatus.OPEN },
        data: {
          status: SubscriptionInvoiceStatus.PAID,
          paidAt: new Date(),
          rawResponse: rawResponse as never,
        },
      });
      if (claimed.count === 0) return;

      const invoice = await tx.subscriptionInvoice.findUniqueOrThrow({
        where: { id: invoiceId },
        select: { subscriptionId: true },
      });

      await tx.subscription.update({
        where: { id: invoice.subscriptionId },
        data: {
          status: SubscriptionStatus.ACTIVE,
          plan: period.plan,
          seats: period.seats,
          currentPeriodEnd: period.currentPeriodEnd,
          cancelAtPeriodEnd: false,
        },
      });
    });
  },

  async voidInvoice(invoiceId: string, rawResponse: unknown): Promise<void> {
    await prisma.subscriptionInvoice.updateMany({
      where: { id: invoiceId, status: SubscriptionInvoiceStatus.OPEN },
      data: {
        status: SubscriptionInvoiceStatus.VOID,
        voidedAt: new Date(),
        rawResponse: rawResponse as never,
      },
    });
  },

  async setCancelAtPeriodEnd(organizationId: string, cancelAtPeriodEnd: boolean): Promise<void> {
    await prisma.subscription.update({
      where: { organizationId },
      data: { cancelAtPeriodEnd },
    });
  },

  async countActiveMemberships(organizationId: string): Promise<number> {
    return prisma.membership.count({ where: { organizationId, status: "ACTIVE" } });
  },

  async findSubscriptionsDueForRenewal(
    dueBefore: Date,
  ): Promise<(SubscriptionRecord & { organization: RenewalOrganization })[]> {
    return prisma.subscription.findMany({
      where: {
        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE] },
        cancelAtPeriodEnd: false,
        currentPeriodEnd: { lte: dueBefore },
        invoices: { none: { status: SubscriptionInvoiceStatus.OPEN } },
      },
      include: {
        organization: {
          select: { id: true, name: true, subdomain: true, isPlatformOrg: true },
        },
      },
    });
  },

  async findInvoicesToReconcile(
    initiatedBefore: Date,
    initiatedAfter: Date,
  ): Promise<SubscriptionInvoiceRecord[]> {
    const invoices = await prisma.subscriptionInvoice.findMany({
      where: {
        status: SubscriptionInvoiceStatus.OPEN,
        provider: { not: null },
        initiatedAt: { lte: initiatedBefore, gte: initiatedAfter },
      },
      select: invoiceRecordSelect,
    });
    return invoices.map(toSubscriptionInvoiceRecord);
  },

  async findExpiredOpenInvoices(initiatedBefore: Date): Promise<SubscriptionInvoiceRecord[]> {
    const invoices = await prisma.subscriptionInvoice.findMany({
      where: {
        status: SubscriptionInvoiceStatus.OPEN,
        initiatedAt: { lte: initiatedBefore },
      },
      select: invoiceRecordSelect,
    });
    return invoices.map(toSubscriptionInvoiceRecord);
  },

  async markSubscriptionPastDue(subscriptionId: string): Promise<boolean> {
    const result = await prisma.subscription.updateMany({
      where: {
        id: subscriptionId,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: { lte: new Date() },
      },
      data: { status: SubscriptionStatus.PAST_DUE },
    });
    return result.count > 0;
  },

  async findOrganizationBillingRecipientEmails(organizationId: string): Promise<string[]> {
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { superAdminMembershipId: true },
    });

    const memberships = await prisma.membership.findMany({
      where: {
        organizationId,
        status: "ACTIVE",
        OR: [
          { id: organization?.superAdminMembershipId ?? "" },
          { role: { permissions: { some: { permissionKey: "billing:manage" } } } },
        ],
      },
      select: { user: { select: { email: true } } },
    });

    return [...new Set(memberships.map((membership) => membership.user.email))];
  },

  async cancelLapsedPastDueSubscriptions(): Promise<number> {
    const graceCutoff = addDays(new Date(), -PAST_DUE_GRACE_DAYS);
    const result = await prisma.subscription.updateMany({
      where: {
        status: SubscriptionStatus.PAST_DUE,
        currentPeriodEnd: { lte: graceCutoff },
      },
      data: { status: SubscriptionStatus.CANCELED },
    });
    return result.count;
  },
};
