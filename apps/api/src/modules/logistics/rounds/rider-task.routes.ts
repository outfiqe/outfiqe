import { Router } from "express";

import { UserRole } from "#generated/prisma/enums.js";
import { requireActiveAuth } from "#middlewares/require-active-account.js";
import { requireIdempotencyKey } from "#middlewares/require-idempotency-key.js";
import { requireRole } from "#middlewares/require-role.js";
import { validate } from "#middlewares/validate.js";

import { logisticsRiderScanRateLimit } from "../logistics.rate-limits.js";
import { logisticsRiderTaskController } from "./rider-task.controller.js";
import {
  collectScanSchema,
  returnDropOffSchema,
  riderTaskIdParamSchema,
  wastedVisitSchema,
} from "./rounds.schemas.js";

const requireRider = [...requireActiveAuth, requireRole(UserRole.RIDER)];

export const logisticsRiderTaskRoutes = Router();

logisticsRiderTaskRoutes.get("/", ...requireRider, logisticsRiderTaskController.listOpen);

logisticsRiderTaskRoutes.get(
  "/:taskId",
  ...requireRider,
  validate({ params: riderTaskIdParamSchema }),
  logisticsRiderTaskController.get,
);

logisticsRiderTaskRoutes.post(
  "/:taskId/collect-scans",
  ...requireRider,
  logisticsRiderScanRateLimit,
  requireIdempotencyKey,
  validate({ params: riderTaskIdParamSchema, body: collectScanSchema }),
  logisticsRiderTaskController.collect,
);

logisticsRiderTaskRoutes.post(
  "/:taskId/return-drop-offs",
  ...requireRider,
  logisticsRiderScanRateLimit,
  validate({ params: riderTaskIdParamSchema, body: returnDropOffSchema }),
  logisticsRiderTaskController.dropOffReturn,
);

logisticsRiderTaskRoutes.post(
  "/:taskId/wasted",
  ...requireRider,
  logisticsRiderScanRateLimit,
  validate({ params: riderTaskIdParamSchema, body: wastedVisitSchema }),
  logisticsRiderTaskController.markWasted,
);

logisticsRiderTaskRoutes.post(
  "/:taskId/finish",
  ...requireRider,
  logisticsRiderScanRateLimit,
  validate({ params: riderTaskIdParamSchema }),
  logisticsRiderTaskController.finish,
);
