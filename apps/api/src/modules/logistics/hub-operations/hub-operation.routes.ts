import { Router } from "express";

import { requireIdempotencyKey } from "#middlewares/require-idempotency-key.js";
import { validate } from "#middlewares/validate.js";
import { platformGuards } from "#modules/platform-access/platform-access.guards.js";

import {
  logisticsHubScanRateLimit,
  logisticsStaffWriteRateLimit,
} from "../logistics.rate-limits.js";
import { logisticsHubOperationController } from "./hub-operation.controller.js";
import {
  checkInPickupSchema,
  fulfilmentGroupIdParamSchema,
  handOverParcelSchema,
  orderIdParamSchema,
  packParcelSchema,
  rebookParcelSchema,
  recordInspectionSchema,
  recordManualBookingSchema,
  shipmentIdParamSchema,
} from "./hub-operation.schemas.js";

export const logisticsHubOperationRoutes = Router();

logisticsHubOperationRoutes.post(
  "/check-ins",
  ...platformGuards.logisticsManage,
  logisticsHubScanRateLimit,
  requireIdempotencyKey,
  validate({ body: checkInPickupSchema }),
  logisticsHubOperationController.checkIn,
);

logisticsHubOperationRoutes.post(
  "/pickups/:groupId/inspection",
  ...platformGuards.logisticsManage,
  logisticsStaffWriteRateLimit,
  validate({ params: fulfilmentGroupIdParamSchema, body: recordInspectionSchema }),
  logisticsHubOperationController.recordInspection,
);

logisticsHubOperationRoutes.post(
  "/orders/:orderId/parcels",
  ...platformGuards.logisticsManage,
  logisticsStaffWriteRateLimit,
  validate({ params: orderIdParamSchema, body: packParcelSchema }),
  logisticsHubOperationController.packParcel,
);

logisticsHubOperationRoutes.post(
  "/shipments/:shipmentId/booking",
  ...platformGuards.logisticsManage,
  logisticsStaffWriteRateLimit,
  validate({ params: shipmentIdParamSchema, body: recordManualBookingSchema }),
  logisticsHubOperationController.recordManualBooking,
);

logisticsHubOperationRoutes.post(
  "/shipments/:shipmentId/rebook",
  ...platformGuards.logisticsManage,
  logisticsStaffWriteRateLimit,
  validate({ params: shipmentIdParamSchema, body: rebookParcelSchema }),
  logisticsHubOperationController.rebookParcel,
);

logisticsHubOperationRoutes.get(
  "/shipments/:shipmentId/label",
  ...platformGuards.logisticsRead,
  validate({ params: shipmentIdParamSchema }),
  logisticsHubOperationController.getLabel,
);

logisticsHubOperationRoutes.post(
  "/shipments/:shipmentId/label-printed",
  ...platformGuards.logisticsManage,
  logisticsStaffWriteRateLimit,
  validate({ params: shipmentIdParamSchema }),
  logisticsHubOperationController.markLabelPrinted,
);

logisticsHubOperationRoutes.post(
  "/handovers",
  ...platformGuards.logisticsManage,
  logisticsHubScanRateLimit,
  requireIdempotencyKey,
  validate({ body: handOverParcelSchema }),
  logisticsHubOperationController.handOver,
);
