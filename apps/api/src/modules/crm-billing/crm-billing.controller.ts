import type { Request, Response } from "express";

import { CrmAuditAction } from "#generated/prisma/enums.js";
import { sendSuccess } from "#lib/api-response.utils.js";
import { validated } from "#middlewares/validate.js";
import { getResolvedOrganization } from "#modules/crm-access/crm-access.middleware.js";
import { AUDIT_TARGET_TYPE } from "#modules/crm-audit/crm-audit.constants.js";
import { crmAudit } from "#modules/crm-audit/crm-audit.service.js";
import { buildAuditActor } from "#modules/crm-audit/crm-audit.utils.js";
import { PaymentVerifyStatus } from "#modules/payments/payment.types.js";

import { DEFAULT_INVOICE_PAGE_SIZE } from "./crm-billing.constants.js";
import type {
  BillingCheckoutBody,
  InvoiceIdParams,
  ListInvoicesQuery,
  PayInvoiceBody,
} from "./crm-billing.schemas.js";
import { crmBillingService } from "./crm-billing.service.js";

export const crmBillingController = {
  async getOverview(_req: Request, res: Response) {
    const organization = getResolvedOrganization(res);
    const overview = await crmBillingService.getOverview(organization);
    sendSuccess(res, overview, "CRM billing overview.");
  },

  async listInvoices(_req: Request, res: Response) {
    const { cursor, limit } = validated.query<ListInvoicesQuery>(res);
    const organization = getResolvedOrganization(res);

    const page = await crmBillingService.listInvoices(organization.id, {
      cursor,
      limit: limit ?? DEFAULT_INVOICE_PAGE_SIZE,
    });
    sendSuccess(res, page, "CRM billing invoices.");
  },

  async checkout(req: Request, res: Response) {
    const { plan, seats, provider } = validated.body<BillingCheckoutBody>(res);
    const organization = getResolvedOrganization(res);

    const redirect = await crmBillingService.checkout(organization, {
      planId: plan,
      seats,
      provider,
    });
    await crmAudit.record({
      organizationId: organization.id,
      action: CrmAuditAction.SUBSCRIPTION_CHECKOUT_STARTED,
      summary: `Started checkout for the ${plan} plan (${seats} seats)`,
      actor: buildAuditActor(req, res),
      target: { type: AUDIT_TARGET_TYPE.SUBSCRIPTION, id: null },
      metadata: { plan, seats, provider },
    });
    sendSuccess(res, redirect, "Checkout started.");
  },

  async payInvoice(_req: Request, res: Response) {
    const { invoiceId } = validated.params<InvoiceIdParams>(res);
    const { provider } = validated.body<PayInvoiceBody>(res);
    const organization = getResolvedOrganization(res);

    const redirect = await crmBillingService.payOutstandingInvoice(
      organization,
      invoiceId,
      provider,
    );
    sendSuccess(res, redirect, "Payment started.");
  },

  async verifyInvoice(req: Request, res: Response) {
    const { invoiceId } = validated.params<InvoiceIdParams>(res);
    const organization = getResolvedOrganization(res);

    const result = await crmBillingService.verifyInvoice(organization.id, invoiceId);
    if (result.status === PaymentVerifyStatus.COMPLETE) {
      await crmAudit.record({
        organizationId: organization.id,
        action: CrmAuditAction.SUBSCRIPTION_ACTIVATED,
        summary: "Subscription payment confirmed",
        actor: buildAuditActor(req, res),
        target: { type: AUDIT_TARGET_TYPE.SUBSCRIPTION, id: invoiceId },
      });
    }
    sendSuccess(res, result, "Invoice verification result.");
  },

  async cancel(req: Request, res: Response) {
    const organization = getResolvedOrganization(res);
    await crmBillingService.cancelAtPeriodEnd(organization.id);
    await crmAudit.record({
      organizationId: organization.id,
      action: CrmAuditAction.SUBSCRIPTION_CANCELED,
      summary: "Set the subscription not to renew",
      actor: buildAuditActor(req, res),
      target: { type: AUDIT_TARGET_TYPE.SUBSCRIPTION, id: null },
    });
    sendSuccess(res, null, "Subscription will not renew.");
  },
};
