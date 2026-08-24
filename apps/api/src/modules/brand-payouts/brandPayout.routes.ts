import { Router } from "express";

import { UserRole } from "#generated/prisma/enums.js";
import { requireAuth } from "#middlewares/require-auth.js";
import { requireRole } from "#middlewares/require-role.js";
import { validate } from "#middlewares/validate.js";

import { brandPayoutController } from "./brandPayout.controller.js";
import {
  createPlatformCommissionRuleSchema,
  listBrandPayoutsQuerySchema,
} from "./brandPayout.schemas.js";

const requireAdmin = [requireAuth, requireRole(UserRole.ADMIN)];

export const brandPayoutRoutes = Router();

brandPayoutRoutes.get("/me/summary", requireAuth, brandPayoutController.getMySummary);

brandPayoutRoutes.get(
  "/me",
  requireAuth,
  validate({ query: listBrandPayoutsQuerySchema }),
  brandPayoutController.listMine,
);

brandPayoutRoutes.get("/commission-rules", ...requireAdmin, brandPayoutController.listRules);

brandPayoutRoutes.post(
  "/commission-rules",
  ...requireAdmin,
  validate({ body: createPlatformCommissionRuleSchema }),
  brandPayoutController.createRule,
);
