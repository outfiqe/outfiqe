import { Router } from "express";

import { rateLimit } from "#middlewares/rate-limit.js";
import { getAuthPrincipal, requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";
import {
  requireAnyPermission,
  requirePermission,
  resolveTenant,
} from "#modules/crm-access/crm-access.middleware.js";
import { requireAdvancedCrmFeatures } from "#modules/crm-billing/crm-billing.middleware.js";

import {
  CRM_REPORTING_RATE_LIMIT_MAX_REQUESTS,
  CRM_REPORTING_RATE_LIMIT_WINDOW_MS,
  CRM_SEARCH_READ_PERMISSION_KEYS,
} from "./crm-reporting.constants.js";
import { crmReportingController } from "./crm-reporting.controller.js";
import { crmSearchQuerySchema } from "./crm-reporting.schemas.js";

const REPORTS_READ = "reports:read";

const tenantChain = [resolveTenant, requireAuth, requireAdvancedCrmFeatures] as const;

const crmSearchRateLimit = rateLimit({
  namespace: "crm-search",
  windowMs: CRM_REPORTING_RATE_LIMIT_WINDOW_MS,
  max: CRM_REPORTING_RATE_LIMIT_MAX_REQUESTS,
  keyGenerator: (_req, res) => getAuthPrincipal(res)?.userId,
  message: "Too many searches. Please slow down.",
});

export const crmReportingRoutes = Router();

crmReportingRoutes.get(
  "/reports/pipeline",
  ...tenantChain,
  requirePermission(REPORTS_READ),
  crmReportingController.getPipelineReport,
);

crmReportingRoutes.get(
  "/reports/tickets",
  ...tenantChain,
  requirePermission(REPORTS_READ),
  crmReportingController.getTicketReport,
);

crmReportingRoutes.get(
  "/search",
  ...tenantChain,
  requireAnyPermission(CRM_SEARCH_READ_PERMISSION_KEYS),
  crmSearchRateLimit,
  validate({ query: crmSearchQuerySchema }),
  crmReportingController.search,
);
