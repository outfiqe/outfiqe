import { Router } from "express";

import { overviewPeriodQuerySchema } from "#lib/overview-period.utils.js";
import { requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";

import { brandOverviewController } from "./brand-overview.controller.js";

export const brandOverviewRoutes = Router();

brandOverviewRoutes.get(
  "/me/overview",
  requireAuth,
  validate({ query: overviewPeriodQuerySchema }),
  brandOverviewController.getMine,
);
