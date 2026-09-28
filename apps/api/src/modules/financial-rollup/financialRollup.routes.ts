import { Router } from "express";

import { validate } from "#middlewares/validate.js";
import { platformGuards } from "#modules/platform-access/platform-access.guards.js";
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
  ...platformGuards.financeRead,
  requirePlatformNavItem("financial-rollup"),
  validate({ query: financialRollupQuerySchema }),
  financialRollupController.get,
);

financialRollupRoutes.get(
  "/ledger",
  ...platformGuards.financeRead,
  requirePlatformNavItem("financial-rollup"),
  validate({ query: financialLedgerQuerySchema }),
  financialRollupController.ledger,
);

financialRollupRoutes.get(
  "/ledger/export",
  ...platformGuards.financeRead,
  requirePlatformNavItem("financial-rollup"),
  validate({ query: financialLedgerExportQuerySchema }),
  financialRollupController.exportLedger,
);
