import { Router } from "express";

import { validate } from "#middlewares/validate.js";
import { platformGuards } from "#modules/platform-access/platform-access.guards.js";

import { logisticsStaffWriteRateLimit } from "../logistics.rate-limits.js";
import { logisticsReturnController } from "./return.controller.js";
import { checkInReturnedParcelSchema, returnShipmentParamSchema } from "./return.schemas.js";

export const logisticsReturnRoutes = Router();

logisticsReturnRoutes.post(
  "/shipments/:shipmentId/return-check-in",
  ...platformGuards.logisticsManage,
  logisticsStaffWriteRateLimit,
  validate({ params: returnShipmentParamSchema, body: checkInReturnedParcelSchema }),
  logisticsReturnController.checkInReturnedParcel,
);
