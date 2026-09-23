import { Router } from "express";

import { rateLimit } from "#middlewares/rate-limit.js";
import { getAuthPrincipal, requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";
import { requirePermission, resolveTenant } from "#modules/crm-access/crm-access.middleware.js";

import {
  CRM_BILLING_CHECKOUT_RATE_LIMIT_MAX_REQUESTS,
  CRM_BILLING_CHECKOUT_RATE_LIMIT_WINDOW_MS,
} from "./crm-billing.constants.js";
import { crmBillingController } from "./crm-billing.controller.js";
import {
  billingCheckoutSchema,
  invoiceIdParamsSchema,
  listInvoicesQuerySchema,
  payInvoiceSchema,
} from "./crm-billing.schemas.js";

const BILLING_READ_PERMISSION = "billing:read";
const BILLING_MANAGE_PERMISSION = "billing:manage";

const checkoutRateLimit = rateLimit({
  namespace: "crm-billing-checkout",
  windowMs: CRM_BILLING_CHECKOUT_RATE_LIMIT_WINDOW_MS,
  max: CRM_BILLING_CHECKOUT_RATE_LIMIT_MAX_REQUESTS,
  keyGenerator: (_req, res) => getAuthPrincipal(res)?.userId,
  message: "Too many checkout attempts. Please try again later.",
});

export const crmBillingRoutes = Router();

crmBillingRoutes.use(resolveTenant, requireAuth);

crmBillingRoutes.get(
  "/",
  requirePermission(BILLING_READ_PERMISSION),
  crmBillingController.getOverview,
);

crmBillingRoutes.get(
  "/invoices",
  requirePermission(BILLING_READ_PERMISSION),
  validate({ query: listInvoicesQuerySchema }),
  crmBillingController.listInvoices,
);

crmBillingRoutes.post(
  "/checkout",
  requirePermission(BILLING_MANAGE_PERMISSION),
  checkoutRateLimit,
  validate({ body: billingCheckoutSchema }),
  crmBillingController.checkout,
);

crmBillingRoutes.post(
  "/invoices/:invoiceId/pay",
  requirePermission(BILLING_MANAGE_PERMISSION),
  checkoutRateLimit,
  validate({ params: invoiceIdParamsSchema, body: payInvoiceSchema }),
  crmBillingController.payInvoice,
);

crmBillingRoutes.post(
  "/invoices/:invoiceId/verify",
  requirePermission(BILLING_MANAGE_PERMISSION),
  validate({ params: invoiceIdParamsSchema }),
  crmBillingController.verifyInvoice,
);

crmBillingRoutes.post(
  "/cancel",
  requirePermission(BILLING_MANAGE_PERMISSION),
  crmBillingController.cancel,
);
