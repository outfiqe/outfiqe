import { z } from "zod";

import { CrmBillingProvider } from "#generated/prisma/enums.js";

import { CRM_PLAN_IDS, MAX_INVOICE_PAGE_SIZE } from "./crm-billing.constants.js";

export const listInvoicesQuerySchema = z.object({
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_INVOICE_PAGE_SIZE).optional(),
});

export const billingCheckoutSchema = z.object({
  plan: z.enum(CRM_PLAN_IDS),
  seats: z.number().int().min(1).max(1000),
  provider: z.enum(CrmBillingProvider),
});

export const invoiceIdParamsSchema = z.object({
  invoiceId: z.uuid(),
});

export const payInvoiceSchema = z.object({
  provider: z.enum(CrmBillingProvider),
});

export type ListInvoicesQuery = z.infer<typeof listInvoicesQuerySchema>;
export type BillingCheckoutBody = z.infer<typeof billingCheckoutSchema>;
export type InvoiceIdParams = z.infer<typeof invoiceIdParamsSchema>;
export type PayInvoiceBody = z.infer<typeof payInvoiceSchema>;
