import { Router } from "express";

import { validate } from "#middlewares/validate.js";
import { platformGuards } from "#modules/platform-access/platform-access.guards.js";

import { logisticsStaffWriteRateLimit } from "../logistics.rate-limits.js";
import { logisticsRiderController } from "./rider.controller.js";
import {
  inviteRiderSchema,
  listRidersQuerySchema,
  riderIdParamSchema,
  updateRiderStatusSchema,
  updateRiderVehicleSchema,
  verifyRiderIdentitySchema,
} from "./rider.schemas.js";

export const logisticsRiderRoutes = Router();

logisticsRiderRoutes.get(
  "/",
  ...platformGuards.logisticsRead,
  validate({ query: listRidersQuerySchema }),
  logisticsRiderController.list,
);

logisticsRiderRoutes.get(
  "/invites",
  ...platformGuards.logisticsRead,
  logisticsRiderController.listInvites,
);

logisticsRiderRoutes.post(
  "/invites",
  ...platformGuards.logisticsManage,
  logisticsStaffWriteRateLimit,
  validate({ body: inviteRiderSchema }),
  logisticsRiderController.invite,
);

logisticsRiderRoutes.post(
  "/:riderId/identity-check",
  ...platformGuards.logisticsManage,
  logisticsStaffWriteRateLimit,
  validate({ params: riderIdParamSchema, body: verifyRiderIdentitySchema }),
  logisticsRiderController.verifyIdentity,
);

logisticsRiderRoutes.patch(
  "/:riderId/status",
  ...platformGuards.logisticsManage,
  logisticsStaffWriteRateLimit,
  validate({ params: riderIdParamSchema, body: updateRiderStatusSchema }),
  logisticsRiderController.setStatus,
);

logisticsRiderRoutes.patch(
  "/:riderId/vehicle",
  ...platformGuards.logisticsManage,
  logisticsStaffWriteRateLimit,
  validate({ params: riderIdParamSchema, body: updateRiderVehicleSchema }),
  logisticsRiderController.updateVehicle,
);
