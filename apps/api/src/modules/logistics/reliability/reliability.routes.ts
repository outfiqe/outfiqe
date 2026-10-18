import { Router } from "express";

import { UserRole } from "#generated/prisma/enums.js";
import { requireActiveAuth } from "#middlewares/require-active-account.js";
import { requireRole } from "#middlewares/require-role.js";
import { validate } from "#middlewares/validate.js";
import { platformGuards } from "#modules/platform-access/platform-access.guards.js";

import { logisticsReliabilityController } from "./reliability.controller.js";
import { listBrandIncidentsQuerySchema } from "./reliability.schemas.js";

const requireBrandOwner = [...requireActiveAuth, requireRole(UserRole.BRAND_OWNER)];

export const logisticsBrandReliabilityRoutes = Router();

logisticsBrandReliabilityRoutes.get(
  "/",
  ...requireBrandOwner,
  validate({ query: listBrandIncidentsQuerySchema }),
  logisticsReliabilityController.getMine,
);

export const logisticsAdminReliabilityRoutes = Router();

logisticsAdminReliabilityRoutes.get(
  "/",
  ...platformGuards.logisticsRead,
  logisticsReliabilityController.listBrandsToWatch,
);
