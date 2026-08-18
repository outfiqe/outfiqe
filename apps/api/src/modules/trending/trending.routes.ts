import { Router } from "express";

import { UserRole } from "#generated/prisma/enums.js";
import { requireAuth } from "#middlewares/require-auth.js";
import { requireRole } from "#middlewares/require-role.js";
import { validate } from "#middlewares/validate.js";

import { trendingController } from "./trending.controller.js";
import { listTopTrendingQuerySchema, trendDebugParamSchema } from "./trending.schemas.js";

const requireAdmin = [requireAuth, requireRole(UserRole.ADMIN)];

export const trendingRoutes = Router();

trendingRoutes.get(
  "/products",
  ...requireAdmin,
  validate({ query: listTopTrendingQuerySchema }),
  trendingController.listTop,
);
trendingRoutes.get(
  "/products/:productId/debug",
  ...requireAdmin,
  validate({ params: trendDebugParamSchema }),
  trendingController.getDebugSnapshot,
);
