import { Router } from "express";

import { requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";
import { requirePermission, resolveTenant } from "#modules/crm-access/crm-access.middleware.js";

import { AUDIT_READ_PERMISSION_KEY } from "./crm-audit.constants.js";
import { crmAuditController } from "./crm-audit.controller.js";
import { listAuditQuerySchema } from "./crm-audit.schemas.js";

export const crmAuditRoutes = Router();

crmAuditRoutes.get(
  "/audit",
  resolveTenant,
  requireAuth,
  requirePermission(AUDIT_READ_PERMISSION_KEY),
  validate({ query: listAuditQuerySchema }),
  crmAuditController.list,
);
