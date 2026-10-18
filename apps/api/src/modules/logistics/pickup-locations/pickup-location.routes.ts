import { Router } from "express";

import { UserRole } from "#generated/prisma/enums.js";
import { requireActiveAuth } from "#middlewares/require-active-account.js";
import { requireRole } from "#middlewares/require-role.js";
import { validate } from "#middlewares/validate.js";

import { logisticsBrandWriteRateLimit } from "../logistics.rate-limits.js";
import { logisticsPickupLocationController } from "./pickup-location.controller.js";
import {
  pickupLocationBodySchema,
  pickupLocationIdParamSchema,
} from "./pickup-location.schemas.js";

const requireBrandOwner = [...requireActiveAuth, requireRole(UserRole.BRAND_OWNER)];

export const logisticsPickupLocationRoutes = Router();

logisticsPickupLocationRoutes.get(
  "/",
  ...requireBrandOwner,
  logisticsPickupLocationController.list,
);

logisticsPickupLocationRoutes.post(
  "/",
  ...requireBrandOwner,
  logisticsBrandWriteRateLimit,
  validate({ body: pickupLocationBodySchema }),
  logisticsPickupLocationController.create,
);

logisticsPickupLocationRoutes.put(
  "/:locationId",
  ...requireBrandOwner,
  logisticsBrandWriteRateLimit,
  validate({ params: pickupLocationIdParamSchema, body: pickupLocationBodySchema }),
  logisticsPickupLocationController.update,
);

logisticsPickupLocationRoutes.post(
  "/:locationId/default",
  ...requireBrandOwner,
  logisticsBrandWriteRateLimit,
  validate({ params: pickupLocationIdParamSchema }),
  logisticsPickupLocationController.makeDefault,
);

logisticsPickupLocationRoutes.delete(
  "/:locationId",
  ...requireBrandOwner,
  logisticsBrandWriteRateLimit,
  validate({ params: pickupLocationIdParamSchema }),
  logisticsPickupLocationController.remove,
);
