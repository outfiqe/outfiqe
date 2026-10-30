import { millisecondsInHour } from "date-fns/constants";
import { Router } from "express";

import { UserRole } from "#generated/prisma/enums.js";
import { rateLimit } from "#middlewares/rate-limit.js";
import { requireActiveAuth } from "#middlewares/require-active-account.js";
import { getAuthPrincipal } from "#middlewares/require-auth.js";
import { requireRole } from "#middlewares/require-role.js";
import { validate } from "#middlewares/validate.js";

import { logisticsCustomerTrackingController } from "./customer-tracking.controller.js";
import { customerOrderParamSchema, reportNotReceivedSchema } from "./customer-tracking.schemas.js";

const DISPUTES_PER_HOUR = 5;

const requireShopper = [...requireActiveAuth, requireRole(UserRole.CUSTOMER)];

const deliveryDisputeRateLimit = rateLimit({
  namespace: "logistics-delivery-dispute",
  windowMs: millisecondsInHour,
  max: DISPUTES_PER_HOUR,
  keyGenerator: (_req, res) => getAuthPrincipal(res)?.userId,
  message: "Too many reports in a short time. Please contact support.",
});

export const logisticsCustomerTrackingRoutes = Router({ mergeParams: true });

logisticsCustomerTrackingRoutes.get(
  "/tracking",
  ...requireShopper,
  validate({ params: customerOrderParamSchema }),
  logisticsCustomerTrackingController.getTracking,
);

logisticsCustomerTrackingRoutes.post(
  "/delivery-disputes",
  ...requireShopper,
  deliveryDisputeRateLimit,
  validate({ params: customerOrderParamSchema, body: reportNotReceivedSchema }),
  logisticsCustomerTrackingController.reportNotReceived,
);
