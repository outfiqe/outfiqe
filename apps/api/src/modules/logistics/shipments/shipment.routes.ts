import { Router } from "express";

import { validate } from "#middlewares/validate.js";
import { platformGuards } from "#modules/platform-access/platform-access.guards.js";

import { logisticsStaffWriteRateLimit } from "../logistics.rate-limits.js";
import { logisticsShipmentController } from "./shipment.controller.js";
import {
  listOrdersToPackQuerySchema,
  listShipmentsQuerySchema,
  recordParcelEventSchema,
  shipmentIdParamSchema,
} from "./shipment.schemas.js";

export const logisticsHubShipmentRoutes = Router();

logisticsHubShipmentRoutes.get(
  "/orders-to-pack",
  ...platformGuards.logisticsRead,
  validate({ query: listOrdersToPackQuerySchema }),
  logisticsShipmentController.listOrdersToPack,
);

logisticsHubShipmentRoutes.get(
  "/shipments",
  ...platformGuards.logisticsRead,
  validate({ query: listShipmentsQuerySchema }),
  logisticsShipmentController.listShipments,
);

logisticsHubShipmentRoutes.get(
  "/shipments/:shipmentId",
  ...platformGuards.logisticsRead,
  validate({ params: shipmentIdParamSchema }),
  logisticsShipmentController.getShipment,
);

logisticsHubShipmentRoutes.post(
  "/shipments/:shipmentId/events",
  ...platformGuards.logisticsManage,
  logisticsStaffWriteRateLimit,
  validate({ params: shipmentIdParamSchema, body: recordParcelEventSchema }),
  logisticsShipmentController.recordEvent,
);
