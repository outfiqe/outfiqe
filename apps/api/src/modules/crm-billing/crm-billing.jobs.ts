import { addDays } from "date-fns/addDays";
import { addMonths } from "date-fns/addMonths";

import { env } from "#config/env.config.js";
import { crmSubscriptionRenewalDueTemplate } from "#email-templates/templates.js";
import { sendEmail } from "#lib/email.utils.js";
import logger from "#lib/winston.utils.js";
import { buildOrganizationAdminUrl } from "#modules/crm-access/crm-access.utils.js";
import { describeError } from "#redis/redis.utils.js";

import {
  BILLING_PERIOD_MONTHS,
  INVOICE_EXPIRE_AFTER_MS,
  INVOICE_RECONCILE_AFTER_MS,
  RENEWAL_LOOKAHEAD_DAYS,
} from "./crm-billing.constants.js";
import { crmBillingRepository } from "./crm-billing.repository.js";
import { crmBillingService } from "./crm-billing.service.js";
import type { RenewalOrganization } from "./crm-billing.types.js";
import { calculateInvoiceAmount, getPlanDefinition } from "./crm-billing.utils.js";

const BILLING_PAGE_PATH = "/crm/billing";

const notifyBillingContacts = async (
  organization: RenewalOrganization,
  amount: number,
): Promise<void> => {
  const recipientEmails = await crmBillingRepository.findOrganizationBillingRecipientEmails(
    organization.id,
  );
  if (recipientEmails.length === 0) return;

  const billingUrl = buildOrganizationAdminUrl(
    organization,
    BILLING_PAGE_PATH,
    env.ADMIN_URL,
    env.TENANT_BASE_DOMAIN,
  );
  const { subject, html } = crmSubscriptionRenewalDueTemplate(
    organization.name,
    amount,
    billingUrl,
  );

  await Promise.all(
    recipientEmails.map((email) =>
      sendEmail({
        to: email,
        subject,
        body: `Renew the ${organization.name} CRM subscription (Rs. ${amount}): ${billingUrl}`,
        html,
      }),
    ),
  );
};

export const runCrmSubscriptionRenewalSweep = async (): Promise<{
  invoicesOpened: number;
  markedPastDue: number;
  canceled: number;
}> => {
  const dueBefore = addDays(new Date(), RENEWAL_LOOKAHEAD_DAYS);
  const subscriptionsDue = await crmBillingRepository.findSubscriptionsDueForRenewal(dueBefore);

  let invoicesOpened = 0;
  let markedPastDue = 0;

  for (const subscription of subscriptionsDue) {
    const plan = getPlanDefinition(subscription.plan);
    if (!plan) {
      logger.error(`CRM renewal skipped — unknown plan "${subscription.plan}"`);
      continue;
    }

    const periodStart = subscription.currentPeriodEnd;
    const periodEnd = addMonths(periodStart, BILLING_PERIOD_MONTHS);
    const amount = calculateInvoiceAmount(plan.id, subscription.seats);

    try {
      await crmBillingRepository.createInvoice({
        subscriptionId: subscription.id,
        plan: subscription.plan,
        seats: subscription.seats,
        amount,
        periodStart,
        periodEnd,
      });
      invoicesOpened += 1;

      await notifyBillingContacts(subscription.organization, amount);

      if (await crmBillingRepository.markSubscriptionPastDue(subscription.id)) markedPastDue += 1;
    } catch (error) {
      logger.error(
        `CRM renewal failed for subscription ${subscription.id}: ${describeError(error)}`,
      );
    }
  }

  const canceled = await crmBillingRepository.cancelLapsedPastDueSubscriptions();

  return { invoicesOpened, markedPastDue, canceled };
};

export const runCrmBillingReconciliationSweep = async (): Promise<{
  checked: number;
  settled: number;
  expired: number;
}> => {
  const now = Date.now();
  const reconcileBefore = new Date(now - INVOICE_RECONCILE_AFTER_MS);
  const expireBefore = new Date(now - INVOICE_EXPIRE_AFTER_MS);

  const invoicesToCheck = await crmBillingRepository.findInvoicesToReconcile(
    reconcileBefore,
    expireBefore,
  );

  let settled = 0;
  for (const invoice of invoicesToCheck) {
    try {
      const status = await crmBillingService.reconcileOpenInvoice(invoice);
      if (status === "COMPLETE") settled += 1;
    } catch (error) {
      logger.error(`CRM invoice reconciliation failed for ${invoice.id}: ${describeError(error)}`);
    }
  }

  const expiredInvoices = await crmBillingRepository.findExpiredOpenInvoices(expireBefore);
  for (const invoice of expiredInvoices) {
    await crmBillingRepository.voidInvoice(invoice.id, { expired: true });
  }

  return { checked: invoicesToCheck.length, settled, expired: expiredInvoices.length };
};
