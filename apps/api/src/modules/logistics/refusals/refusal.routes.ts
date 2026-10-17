import { Router } from "express";

import { UserRole } from "#generated/prisma/enums.js";
import { requireActiveAuth } from "#middlewares/require-active-account.js";
import { requireRole } from "#middlewares/require-role.js";
import { validate } from "#middlewares/validate.js";
import { platformGuards } from "#modules/platform-access/platform-access.guards.js";

import { logisticsStaffWriteRateLimit } from "../logistics.rate-limits.js";
import { logisticsRefusalController } from "./refusal.controller.js";
import {
  clearRefusalsSchema,
  codEligibilityQuerySchema,
  refusalOrderParamSchema,
} from "./refusal.schemas.js";

const requireShopper = [...requireActiveAuth, requireRole(UserRole.CUSTOMER)];

export const logisticsCodEligibilityRoutes = Router();

logisticsCodEligibilityRoutes.get(
  "/",
  ...requireShopper,
  validate({ query: codEligibilityQuerySchema }),
  logisticsRefusalController.getMyCodEligibility,
);

export const logisticsAdminRefusalRoutes = Router({ mergeParams: true });

logisticsAdminRefusalRoutes.get(
  "/",
  ...platformGuards.logisticsRead,
  validate({ params: refusalOrderParamSchema }),
  logisticsRefusalController.getOrderCustomerRefusals,
);

logisticsAdminRefusalRoutes.post(
  "/clear",
  ...platformGuards.logisticsManage,
  logisticsStaffWriteRateLimit,
  validate({ params: refusalOrderParamSchema, body: clearRefusalsSchema }),
  logisticsRefusalController.clearOrderCustomerRefusals,
);
