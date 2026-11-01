import { Router } from "express";

import { crmExportRateLimit } from "#middlewares/crm-rate-limit.js";
import { requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";
import { requirePermission, resolveTenant } from "#modules/crm-access/crm-access.middleware.js";

import { AUDIT_READ_PERMISSION_KEY } from "./crm-audit.constants.js";
import { crmAuditController } from "./crm-audit.controller.js";
import { exportAuditQuerySchema, listAuditQuerySchema } from "./crm-audit.schemas.js";

const auditChain = [
  resolveTenant,
  requireAuth,
  requirePermission(AUDIT_READ_PERMISSION_KEY),
] as const;

export const crmAuditRoutes = Router();

crmAuditRoutes.get("/audit/filters", ...auditChain, crmAuditController.listFilterOptions);

crmAuditRoutes.get(
  "/audit/export",
  ...auditChain,
  crmExportRateLimit,
  validate({ query: exportAuditQuerySchema }),
  crmAuditController.exportLog,
);

crmAuditRoutes.get(
  "/audit",
  ...auditChain,
  validate({ query: listAuditQuerySchema }),
  crmAuditController.list,
);
