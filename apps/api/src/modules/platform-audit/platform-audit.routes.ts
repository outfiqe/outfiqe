import { Router } from "express";

import { validate } from "#middlewares/validate.js";
import { requirePlatformRole } from "#modules/platform-access/platform-access.middleware.js";

import { platformAuditController } from "./platform-audit.controller.js";
import { listPlatformAuditQuerySchema } from "./platform-audit.schemas.js";

export const platformAuditRoutes = Router();

platformAuditRoutes.get(
  "/audit",
  ...requirePlatformRole("platform:audit:read"),
  validate({ query: listPlatformAuditQuerySchema }),
  platformAuditController.listAuditLogs,
);
