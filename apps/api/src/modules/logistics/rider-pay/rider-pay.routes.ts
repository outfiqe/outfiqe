import { Router } from "express";

import { UserRole } from "#generated/prisma/enums.js";
import { requireActiveAuth } from "#middlewares/require-active-account.js";
import { requireRole } from "#middlewares/require-role.js";
import { validate } from "#middlewares/validate.js";
import { platformGuards } from "#modules/platform-access/platform-access.guards.js";

import { logisticsStaffWriteRateLimit } from "../logistics.rate-limits.js";
import { logisticsRiderPayController } from "./rider-pay.controller.js";
import {
  createRiderPayRateSchema,
  listMyRiderEarningsQuerySchema,
  listRiderEarningsQuerySchema,
  riderEarningParamSchema,
  riderPayRateParamSchema,
  riderPayRatesQuerySchema,
  voidRiderEarningSchema,
} from "./rider-pay.schemas.js";

const requireRider = [...requireActiveAuth, requireRole(UserRole.RIDER)];

export const logisticsRiderPayRateRoutes = Router();

logisticsRiderPayRateRoutes.get(
  "/",
  ...platformGuards.logisticsRead,
  validate({ query: riderPayRatesQuerySchema }),
  logisticsRiderPayController.getRates,
);

logisticsRiderPayRateRoutes.post(
  "/",
  ...platformGuards.logisticsManage,
  logisticsStaffWriteRateLimit,
  validate({ body: createRiderPayRateSchema }),
  logisticsRiderPayController.createRate,
);

logisticsRiderPayRateRoutes.post(
  "/:rateId/deactivate",
  ...platformGuards.logisticsManage,
  logisticsStaffWriteRateLimit,
  validate({ params: riderPayRateParamSchema }),
  logisticsRiderPayController.deactivateRate,
);

export const logisticsRiderEarningAdminRoutes = Router();

logisticsRiderEarningAdminRoutes.get(
  "/",
  ...platformGuards.logisticsRead,
  validate({ query: listRiderEarningsQuerySchema }),
  logisticsRiderPayController.listEarnings,
);

logisticsRiderEarningAdminRoutes.post(
  "/:earningId/void",
  ...platformGuards.logisticsManage,
  logisticsStaffWriteRateLimit,
  validate({ params: riderEarningParamSchema, body: voidRiderEarningSchema }),
  logisticsRiderPayController.voidEarning,
);

export const logisticsRiderEarningRoutes = Router();

logisticsRiderEarningRoutes.get(
  "/",
  ...requireRider,
  validate({ query: listMyRiderEarningsQuerySchema }),
  logisticsRiderPayController.listMyEarnings,
);
