import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { validated } from "#middlewares/validate.js";
import { getResolvedOrganization } from "#modules/crm-access/crm-access.middleware.js";

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

  async checkout(_req: Request, res: Response) {
    const { plan, seats, provider } = validated.body<BillingCheckoutBody>(res);
    const organization = getResolvedOrganization(res);

    const redirect = await crmBillingService.checkout(organization, {
      planId: plan,
      seats,
      provider,
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

  async verifyInvoice(_req: Request, res: Response) {
    const { invoiceId } = validated.params<InvoiceIdParams>(res);
    const organization = getResolvedOrganization(res);

    const result = await crmBillingService.verifyInvoice(organization.id, invoiceId);
    sendSuccess(res, result, "Invoice verification result.");
  },

  async cancel(_req: Request, res: Response) {
    const organization = getResolvedOrganization(res);
    await crmBillingService.cancelAtPeriodEnd(organization.id);
    sendSuccess(res, null, "Subscription will not renew.");
  },
};
