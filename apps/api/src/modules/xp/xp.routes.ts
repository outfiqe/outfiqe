import { Router } from "express";

import { requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";
import { requirePlatformAccess } from "#modules/crm-access/crm-access.middleware.js";
import { requirePlatformNavItem } from "#modules/platform-nav-access/platform-nav-access.middleware.js";

import { xpController } from "./xp.controller.js";
import {
  activityTypeParamSchema,
  adjustXpSchema,
  createLevelSchema,
  createXpMultiplierSchema,
  levelIdParamSchema,
  listXpTransactionsQuerySchema,
  updateActivityXpConfigSchema,
  updateLevelSchema,
  updateXpMultiplierSchema,
  xpMultiplierIdParamSchema,
} from "./xp.schemas.js";

const requireAdmin = [requireAuth, requirePlatformAccess, requirePlatformNavItem("gamification")];

export const xpRoutes = Router();

xpRoutes.get("/me", requireAuth, xpController.getMyProgress);

xpRoutes.get(
  "/me/transactions",
  requireAuth,
  validate({ query: listXpTransactionsQuerySchema }),
  xpController.listMyTransactions,
);

xpRoutes.get("/levels", ...requireAdmin, xpController.listLevels);

xpRoutes.post(
  "/levels",
  ...requireAdmin,
  validate({ body: createLevelSchema }),
  xpController.createLevel,
);

xpRoutes.patch(
  "/levels/:id",
  ...requireAdmin,
  validate({ params: levelIdParamSchema, body: updateLevelSchema }),
  xpController.updateLevel,
);

xpRoutes.get("/multiplier/active", requireAuth, xpController.getActiveMultiplier);

xpRoutes.get("/multipliers", ...requireAdmin, xpController.listMultipliers);

xpRoutes.post(
  "/multipliers",
  ...requireAdmin,
  validate({ body: createXpMultiplierSchema }),
  xpController.createMultiplier,
);

xpRoutes.patch(
  "/multipliers/:id",
  ...requireAdmin,
  validate({ params: xpMultiplierIdParamSchema, body: updateXpMultiplierSchema }),
  xpController.updateMultiplier,
);

xpRoutes.get("/activity-config", ...requireAdmin, xpController.listActivityConfigs);

xpRoutes.patch(
  "/activity-config/:activityType",
  ...requireAdmin,
  validate({ params: activityTypeParamSchema, body: updateActivityXpConfigSchema }),
  xpController.updateActivityConfig,
);

xpRoutes.post(
  "/adjust",
  ...requireAdmin,
  validate({ body: adjustXpSchema }),
  xpController.adjustXp,
);

xpRoutes.get("/stats", ...requireAdmin, xpController.getAdminStats);
