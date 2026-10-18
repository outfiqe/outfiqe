import { Router } from "express";

import { validate } from "#middlewares/validate.js";
import { platformGuards } from "#modules/platform-access/platform-access.guards.js";

import { logisticsStaffWriteRateLimit } from "../logistics.rate-limits.js";
import { logisticsRoundController } from "./rounds.controller.js";
import {
  assignRiderTaskSchema,
  listRiderTasksQuerySchema,
  pickupBoardQuerySchema,
  riderTaskIdParamSchema,
} from "./rounds.schemas.js";

export const logisticsPickupBoardRoutes = Router();

logisticsPickupBoardRoutes.get(
  "/",
  ...platformGuards.logisticsRead,
  validate({ query: pickupBoardQuerySchema }),
  logisticsRoundController.listPickupBoard,
);

export const logisticsRiderTaskAdminRoutes = Router();

logisticsRiderTaskAdminRoutes.get(
  "/",
  ...platformGuards.logisticsRead,
  validate({ query: listRiderTasksQuerySchema }),
  logisticsRoundController.listTasks,
);

logisticsRiderTaskAdminRoutes.post(
  "/",
  ...platformGuards.logisticsManage,
  logisticsStaffWriteRateLimit,
  validate({ body: assignRiderTaskSchema }),
  logisticsRoundController.assignTask,
);

logisticsRiderTaskAdminRoutes.post(
  "/:taskId/cancel",
  ...platformGuards.logisticsManage,
  logisticsStaffWriteRateLimit,
  validate({ params: riderTaskIdParamSchema }),
  logisticsRoundController.cancelTask,
);
