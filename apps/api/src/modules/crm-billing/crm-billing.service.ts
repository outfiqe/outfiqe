import { addMonths } from "date-fns/addMonths";

import { env } from "#config/env.config.js";
import { CrmBillingProvider } from "#generated/prisma/enums.js";
import logger from "#lib/winston.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { buildOrganizationAdminUrl } from "#modules/crm-access/crm-access.utils.js";
import type { PaymentProvider, PaymentVerifyStatusValue } from "#modules/payments/payment.types.js";
import { PaymentVerifyStatus } from "#modules/payments/payment.types.js";
import { esewaProvider } from "#modules/payments/providers/esewa.provider.js";
import { khaltiProvider } from "#modules/payments/providers/khalti.provider.js";
import { describeError } from "#redis/redis.utils.js";

import { BILLING_PERIOD_MONTHS, CRM_PLAN_CATALOG } from "./crm-billing.constants.js";
import { crmBillingRepository } from "./crm-billing.repository.js";
import type {
  AdvancedFeatureGateInput,
  BillingCheckoutRedirect,
  BillingOverview,
  CrmPlanId,
  InvoicePage,
  SubscriptionInvoiceRecord,
} from "./crm-billing.types.js";
import {
  calculateInvoiceAmount,
  clampSeatsToPlan,
  getPlanDefinition,
  isAdvancedCrmEnabled,
} from "./crm-billing.utils.js";

const NOT_FOUND_STATUS = 404;
const CONFLICT_STATUS = 409;
const BAD_GATEWAY_STATUS = 502;

const BILLING_RETURN_PATH = "/crm/billing/return";

type TenantOrganization = AdvancedFeatureGateInput & {
  id: string;
  subdomain: string;
};

const billingProviders: Record<CrmBillingProvider, PaymentProvider> = {
  [CrmBillingProvider.ESEWA]: esewaProvider,
  [CrmBillingProvider.KHALTI]: khaltiProvider,
};

const buildReturnUrl = (organization: TenantOrganization, invoiceId: string): string =>
  buildOrganizationAdminUrl(
    organization,
    `${BILLING_RETURN_PATH}?invoiceId=${invoiceId}`,
    env.ADMIN_URL,
    env.TENANT_BASE_DOMAIN,
  );

const startProviderPaymentForInvoice = async (
  organization: TenantOrganization,
  invoice: SubscriptionInvoiceRecord,
  provider: CrmBillingProvider,
): Promise<BillingCheckoutRedirect> => {
  const returnUrl = buildReturnUrl(organization, invoice.id);

  let redirect: Awaited<ReturnType<PaymentProvider["initiate"]>>;
  try {
    redirect = await billingProviders[provider].initiate({
      transactionUuid: invoice.id,
      subtotal: invoice.amount,
      deliveryFee: 0,
      totalAmount: invoice.amount,
      successUrl: returnUrl,
      failureUrl: returnUrl,
    });
  } catch (error) {
    await crmBillingRepository.voidInvoice(invoice.id, { initiateFailed: true });
    logger.error(`CRM billing initiate failed for invoice ${invoice.id}: ${describeError(error)}`);
    throw new AppError(
      "BILLING_PROVIDER_UNAVAILABLE",
      "Couldn't start the payment. Please try again in a moment.",
      BAD_GATEWAY_STATUS,
    );
  }

  await crmBillingRepository.markInvoiceInitiated(
    invoice.id,
    provider,
    redirect.providerRef ?? null,
  );

  return redirect.mode === "FORM_POST"
    ? {
        mode: "FORM_POST",
        formUrl: redirect.formUrl,
        fields: redirect.fields,
        invoiceId: invoice.id,
      }
    : { mode: "REDIRECT", redirectUrl: redirect.redirectUrl, invoiceId: invoice.id };
};

const verifyOpenInvoiceAgainstProvider = async (
  invoice: SubscriptionInvoiceRecord & {
    provider: NonNullable<SubscriptionInvoiceRecord["provider"]>;
  },
): Promise<PaymentVerifyStatusValue> => {
  const verification = await billingProviders[invoice.provider].verify({
    transactionUuid: invoice.id,
    providerRef: invoice.providerRef,
    totalAmount: invoice.amount,
  });

  if (verification.status === PaymentVerifyStatus.COMPLETE) {
    await crmBillingRepository.settleInvoiceAsPaid(invoice.id, verification.rawResponse, {
      plan: invoice.plan,
      seats: invoice.seats,
      currentPeriodEnd: invoice.periodEnd,
    });
  } else if (verification.status === PaymentVerifyStatus.FAILED) {
    await crmBillingRepository.voidInvoice(invoice.id, verification.rawResponse);
  }

  return verification.status;
};

export const crmBillingService = {
  async resolveAdvancedFeaturesForOrganization(
    organization: AdvancedFeatureGateInput & { id: string },
  ): Promise<boolean> {
    const subscription = await crmBillingRepository.findSubscriptionByOrganizationId(
      organization.id,
    );
    return isAdvancedCrmEnabled(organization, subscription);
  },

  async getOverview(
    organization: AdvancedFeatureGateInput & { id: string },
  ): Promise<BillingOverview> {
    const [subscription, activeSeatCount] = await Promise.all([
      crmBillingRepository.findSubscriptionByOrganizationId(organization.id),
      crmBillingRepository.countActiveMemberships(organization.id),
    ]);

    return {
      subscription,
      advancedFeaturesEnabled: isAdvancedCrmEnabled(organization, subscription),
      planCatalog: Object.values(CRM_PLAN_CATALOG),
      activeSeatCount,
    };
  },

  async listInvoices(
    organizationId: string,
    params: { cursor?: string; limit: number },
  ): Promise<InvoicePage> {
    const invoices = await crmBillingRepository.listInvoicesForOrganization(organizationId, params);

    const hasMore = invoices.length > params.limit;
    const page = hasMore ? invoices.slice(0, params.limit) : invoices;
    const nextCursor = hasMore ? (page.at(-1)?.id ?? null) : null;

    return { invoices: page, nextCursor };
  },

  async checkout(
    organization: TenantOrganization,
    input: { planId: CrmPlanId; seats: number; provider: CrmBillingProvider },
  ): Promise<BillingCheckoutRedirect> {
    const plan = getPlanDefinition(input.planId);
    if (!plan) {
      throw new AppError("UNKNOWN_PLAN", "That plan isn't available.", NOT_FOUND_STATUS);
    }

    const activeSeatCount = await crmBillingRepository.countActiveMemberships(organization.id);
    const seats = Math.max(clampSeatsToPlan(input.planId, input.seats), activeSeatCount);
    const amount = calculateInvoiceAmount(input.planId, seats);

    const periodStart = new Date();
    const periodEnd = addMonths(periodStart, BILLING_PERIOD_MONTHS);

    const subscription = await crmBillingRepository.upsertSubscriptionPlan({
      organizationId: organization.id,
      plan: input.planId,
      seats,
      fallbackCurrentPeriodEnd: periodEnd,
    });

    const invoice = await crmBillingRepository.createInvoice({
      subscriptionId: subscription.id,
      plan: input.planId,
      seats,
      amount,
      periodStart,
      periodEnd,
    });

    return startProviderPaymentForInvoice(organization, invoice, input.provider);
  },

  async payOutstandingInvoice(
    organization: TenantOrganization,
    invoiceId: string,
    provider: CrmBillingProvider,
  ): Promise<BillingCheckoutRedirect> {
    const invoice = await crmBillingRepository.findInvoiceForOrganization(
      organization.id,
      invoiceId,
    );
    if (!invoice) {
      throw new AppError("INVOICE_NOT_FOUND", "Invoice not found.", NOT_FOUND_STATUS);
    }
    if (invoice.status !== "OPEN") {
      throw new AppError(
        "INVOICE_NOT_PAYABLE",
        "This invoice can no longer be paid.",
        CONFLICT_STATUS,
      );
    }

    return startProviderPaymentForInvoice(organization, invoice, provider);
  },

  async verifyInvoice(
    organizationId: string,
    invoiceId: string,
  ): Promise<{ status: PaymentVerifyStatusValue }> {
    const invoice = await crmBillingRepository.findInvoiceForOrganization(
      organizationId,
      invoiceId,
    );
    if (!invoice) {
      throw new AppError("INVOICE_NOT_FOUND", "Invoice not found.", NOT_FOUND_STATUS);
    }

    if (invoice.status === "PAID") return { status: PaymentVerifyStatus.COMPLETE };
    if (invoice.status === "VOID") return { status: PaymentVerifyStatus.FAILED };
    if (!invoice.provider) {
      throw new AppError(
        "INVOICE_NOT_PAYABLE",
        "This invoice has no payment in progress.",
        CONFLICT_STATUS,
      );
    }

    return {
      status: await verifyOpenInvoiceAgainstProvider({ ...invoice, provider: invoice.provider }),
    };
  },

  async cancelAtPeriodEnd(organizationId: string): Promise<void> {
    const subscription =
      await crmBillingRepository.findSubscriptionByOrganizationId(organizationId);
    if (!subscription || subscription.status === "CANCELED") {
      throw new AppError(
        "NO_ACTIVE_SUBSCRIPTION",
        "There's no active subscription to cancel.",
        CONFLICT_STATUS,
      );
    }
    await crmBillingRepository.setCancelAtPeriodEnd(organizationId, true);
  },

  async reconcileOpenInvoice(
    invoice: SubscriptionInvoiceRecord,
  ): Promise<PaymentVerifyStatusValue> {
    if (!invoice.provider || invoice.status !== "OPEN") return PaymentVerifyStatus.PENDING;
    return verifyOpenInvoiceAgainstProvider({ ...invoice, provider: invoice.provider });
  },
};
