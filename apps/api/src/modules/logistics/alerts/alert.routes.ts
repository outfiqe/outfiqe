import { Router } from "express";

import { validate } from "#middlewares/validate.js";
import { platformGuards } from "#modules/platform-access/platform-access.guards.js";

import { logisticsStaffWriteRateLimit } from "../logistics.rate-limits.js";
import { logisticsAlertController } from "./alert.controller.js";
import {
  listLogisticsAlertsQuerySchema,
  logisticsAlertParamSchema,
  resolveLogisticsAlertSchema,
} from "./alert.schemas.js";

export const logisticsAlertRoutes = Router();

logisticsAlertRoutes.get(
  "/",
  ...platformGuards.logisticsRead,
  validate({ query: listLogisticsAlertsQuerySchema }),
  logisticsAlertController.listAlerts,
);

logisticsAlertRoutes.post(
  "/:alertId/resolve",
  ...platformGuards.logisticsManage,
  logisticsStaffWriteRateLimit,
  validate({ params: logisticsAlertParamSchema, body: resolveLogisticsAlertSchema }),
  logisticsAlertController.resolveAlert,
);
