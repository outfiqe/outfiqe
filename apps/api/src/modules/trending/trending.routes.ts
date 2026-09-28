import { Router } from "express";

import { validate } from "#middlewares/validate.js";
import { platformGuards } from "#modules/platform-access/platform-access.guards.js";

import { trendingController } from "./trending.controller.js";
import { listTopTrendingQuerySchema, trendDebugParamSchema } from "./trending.schemas.js";

export const trendingRoutes = Router();

trendingRoutes.get(
  "/products",
  ...platformGuards.catalogRead,
  validate({ query: listTopTrendingQuerySchema }),
  trendingController.listTop,
);
trendingRoutes.get(
  "/products/:productId/debug",
  ...platformGuards.catalogRead,
  validate({ params: trendDebugParamSchema }),
  trendingController.getDebugSnapshot,
);
