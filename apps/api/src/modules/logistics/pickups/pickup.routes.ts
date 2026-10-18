import { Router } from "express";

import { UserRole } from "#generated/prisma/enums.js";
import { requireActiveAuth } from "#middlewares/require-active-account.js";
import { requireRole } from "#middlewares/require-role.js";
import { validate } from "#middlewares/validate.js";

import { logisticsBrandWriteRateLimit } from "../logistics.rate-limits.js";
import { logisticsPickupController } from "./pickup.controller.js";
import { pickupGroupIdParamSchema } from "./pickup.schemas.js";

const requireBrandOwner = [...requireActiveAuth, requireRole(UserRole.BRAND_OWNER)];

export const logisticsPickupRoutes = Router();

logisticsPickupRoutes.post(
  "/:fulfilmentGroupId/ready",
  ...requireBrandOwner,
  logisticsBrandWriteRateLimit,
  validate({ params: pickupGroupIdParamSchema }),
  logisticsPickupController.markReady,
);
