import { Router } from "express";

import { validate } from "#middlewares/validate.js";
import { requirePlatformRole } from "#modules/platform-access/platform-access.middleware.js";

import { platformMetricsController } from "./platform-metrics.controller.js";
import { listTenantsQuerySchema, tenantIdParamsSchema } from "./platform-metrics.schemas.js";

export const platformMetricsRoutes = Router();

const metricsChain = requirePlatformRole("platform:metrics:read");

platformMetricsRoutes.get("/metrics/overview", ...metricsChain, platformMetricsController.overview);

platformMetricsRoutes.get(
  "/metrics/activity-trend",
  ...metricsChain,
  platformMetricsController.activityTrend,
);

platformMetricsRoutes.get(
  "/metrics/tenants",
  ...metricsChain,
  validate({ query: listTenantsQuerySchema }),
  platformMetricsController.listTenants,
);

platformMetricsRoutes.get(
  "/metrics/tenants/:orgId",
  ...metricsChain,
  validate({ params: tenantIdParamsSchema }),
  platformMetricsController.tenantDetail,
);
