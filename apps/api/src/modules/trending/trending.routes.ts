import { Router } from "express";

import { requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";
import { requirePlatformAccess } from "#modules/crm-access/crm-access.middleware.js";

import { trendingController } from "./trending.controller.js";
import { listTopTrendingQuerySchema, trendDebugParamSchema } from "./trending.schemas.js";

const requireAdmin = [requireAuth, requirePlatformAccess];

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
