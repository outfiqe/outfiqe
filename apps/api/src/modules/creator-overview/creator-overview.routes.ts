import { Router } from "express";

import { overviewPeriodQuerySchema } from "#lib/overview-period.utils.js";
import { requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";

import { creatorOverviewController } from "./creator-overview.controller.js";

export const creatorOverviewRoutes = Router();

creatorOverviewRoutes.get(
  "/me/overview",
  requireAuth,
  validate({ query: overviewPeriodQuerySchema }),
  creatorOverviewController.getMine,
);
