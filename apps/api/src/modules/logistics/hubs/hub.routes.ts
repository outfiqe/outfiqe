import { Router } from "express";

import { validate } from "#middlewares/validate.js";
import { platformGuards } from "#modules/platform-access/platform-access.guards.js";

import { logisticsStaffWriteRateLimit } from "../logistics.rate-limits.js";
import { logisticsHubController } from "./hub.controller.js";
import { hubBodySchema, hubIdParamSchema, setHubPickupZonesSchema } from "./hub.schemas.js";

export const logisticsHubRoutes = Router();

logisticsHubRoutes.get("/", ...platformGuards.logisticsRead, logisticsHubController.list);

logisticsHubRoutes.post(
  "/",
  ...platformGuards.logisticsManage,
  logisticsStaffWriteRateLimit,
  validate({ body: hubBodySchema }),
  logisticsHubController.create,
);

logisticsHubRoutes.put(
  "/:hubId",
  ...platformGuards.logisticsManage,
  logisticsStaffWriteRateLimit,
  validate({ params: hubIdParamSchema, body: hubBodySchema }),
  logisticsHubController.update,
);

logisticsHubRoutes.put(
  "/:hubId/pickup-zones",
  ...platformGuards.logisticsManage,
  logisticsStaffWriteRateLimit,
  validate({ params: hubIdParamSchema, body: setHubPickupZonesSchema }),
  logisticsHubController.setPickupZones,
);
