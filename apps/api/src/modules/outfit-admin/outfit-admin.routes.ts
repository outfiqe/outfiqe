import { Router } from "express";

import { validate } from "#middlewares/validate.js";
import { requirePlatformRole } from "#modules/platform-access/platform-access.middleware.js";

import { outfitAdminController } from "./outfit-admin.controller.js";
import {
  adminBuildActionSchema,
  adminBuildHistoryQuerySchema,
  adminBuildIdParamSchema,
  buildMetricsQuerySchema,
  listAdminBuildsQuerySchema,
} from "./outfit-admin.schemas.js";

export const outfitAdminRoutes = Router();

const buildsReadChain = requirePlatformRole("platform:builds:read", "platform:builds:manage");
const buildsManageChain = requirePlatformRole("platform:builds:manage");

outfitAdminRoutes.get(
  "/builds",
  ...buildsReadChain,
  validate({ query: listAdminBuildsQuerySchema }),
  outfitAdminController.listBuilds,
);

outfitAdminRoutes.get(
  "/builds/metrics",
  ...buildsReadChain,
  validate({ query: buildMetricsQuerySchema }),
  outfitAdminController.getMetrics,
);

outfitAdminRoutes.get(
  "/builds/:id",
  ...buildsReadChain,
  validate({ params: adminBuildIdParamSchema }),
  outfitAdminController.getBuild,
);

outfitAdminRoutes.get(
  "/builds/:id/history",
  ...buildsReadChain,
  validate({ params: adminBuildIdParamSchema, query: adminBuildHistoryQuerySchema }),
  outfitAdminController.getBuildHistory,
);

outfitAdminRoutes.post(
  "/builds/:id/unlock",
  ...buildsManageChain,
  validate({ params: adminBuildIdParamSchema, body: adminBuildActionSchema }),
  outfitAdminController.unlockBuild,
);

outfitAdminRoutes.post(
  "/builds/:id/archive",
  ...buildsManageChain,
  validate({ params: adminBuildIdParamSchema, body: adminBuildActionSchema }),
  outfitAdminController.archiveBuild,
);
