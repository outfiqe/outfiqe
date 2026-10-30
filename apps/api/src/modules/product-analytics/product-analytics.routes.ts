import { Router } from "express";

import { validate } from "#middlewares/validate.js";
import { platformGuards } from "#modules/platform-access/platform-access.guards.js";

import { productAnalyticsController } from "./product-analytics.controller.js";
import { insightRangeQuerySchema } from "./product-analytics.schemas.js";

export const productAnalyticsRoutes = Router();

const analyticsChain = [
  ...platformGuards.analyticsRead,
  validate({ query: insightRangeQuerySchema }),
] as const;

productAnalyticsRoutes.get(
  "/analytics/overview",
  ...analyticsChain,
  productAnalyticsController.overview,
);
productAnalyticsRoutes.get(
  "/analytics/funnels/purchase",
  ...analyticsChain,
  productAnalyticsController.purchaseFunnel,
);
productAnalyticsRoutes.get(
  "/analytics/funnels/look-to-order",
  ...analyticsChain,
  productAnalyticsController.lookToOrder,
);
productAnalyticsRoutes.get(
  "/analytics/acquisition",
  ...analyticsChain,
  productAnalyticsController.acquisition,
);
productAnalyticsRoutes.get(
  "/analytics/retention",
  ...analyticsChain,
  productAnalyticsController.retention,
);
productAnalyticsRoutes.get(
  "/analytics/search/zero-results",
  ...analyticsChain,
  productAnalyticsController.zeroResultSearches,
);
