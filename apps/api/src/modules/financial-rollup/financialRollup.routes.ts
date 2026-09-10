import { Router } from "express";

import { requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";
import { requirePlatformAccess } from "#modules/crm-access/crm-access.middleware.js";
import { requirePlatformNavItem } from "#modules/platform-nav-access/platform-nav-access.middleware.js";

import { financialRollupController } from "./financialRollup.controller.js";
import {
  financialLedgerExportQuerySchema,
  financialLedgerQuerySchema,
  financialRollupQuerySchema,
} from "./financialRollup.schemas.js";

export const financialRollupRoutes = Router();

financialRollupRoutes.get(
  "/",
  requireAuth,
  requirePlatformAccess,
  requirePlatformNavItem("financial-rollup"),
  validate({ query: financialRollupQuerySchema }),
  financialRollupController.get,
);

financialRollupRoutes.get(
  "/ledger",
  requireAuth,
  requirePlatformAccess,
  requirePlatformNavItem("financial-rollup"),
  validate({ query: financialLedgerQuerySchema }),
  financialRollupController.ledger,
);

financialRollupRoutes.get(
  "/ledger/export",
  requireAuth,
  requirePlatformAccess,
  requirePlatformNavItem("financial-rollup"),
  validate({ query: financialLedgerExportQuerySchema }),
  financialRollupController.exportLedger,
);
