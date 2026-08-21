import { Router } from "express";

import { UserRole } from "#generated/prisma/enums.js";
import { requireAuth } from "#middlewares/require-auth.js";
import { requireRole } from "#middlewares/require-role.js";
import { validate } from "#middlewares/validate.js";

import { xpController } from "./xp.controller.js";
import {
  activityTypeParamSchema,
  adjustXpSchema,
  createLevelSchema,
  levelIdParamSchema,
  listXpTransactionsQuerySchema,
  updateActivityXpConfigSchema,
  updateLevelSchema,
} from "./xp.schemas.js";

const requireAdmin = [requireAuth, requireRole(UserRole.ADMIN)];

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
