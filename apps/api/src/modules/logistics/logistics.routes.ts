import { Router } from "express";

import { logisticsBagTagRoutes } from "./bag-tags/bag-tag.routes.js";
import { logisticsCustomerTrackingRoutes } from "./customer-tracking/customer-tracking.routes.js";
import { logisticsHubOperationRoutes } from "./hub-operations/hub-operation.routes.js";
import { logisticsHubRoutes } from "./hubs/hub.routes.js";
import { partnerWebhookReceiptRoutes } from "./partner-webhooks/partner-webhook.routes.js";
import { logisticsPartnerRoutes } from "./partners/partner.routes.js";
import { logisticsPickupLocationRoutes } from "./pickup-locations/pickup-location.routes.js";
import { logisticsPickupRoutes } from "./pickups/pickup.routes.js";
import { logisticsRiderRoutes } from "./riders/rider.routes.js";
import { logisticsRiderTaskRoutes } from "./rounds/rider-task.routes.js";
import {
  logisticsPickupBoardRoutes,
  logisticsRiderTaskAdminRoutes,
} from "./rounds/rounds.routes.js";
import { logisticsHubShipmentRoutes } from "./shipments/shipment.routes.js";

export const logisticsRoutes = Router();

logisticsRoutes.use("/admin/hubs", logisticsHubRoutes);
logisticsRoutes.use("/admin/riders", logisticsRiderRoutes);
logisticsRoutes.use("/admin/bag-tag-batches", logisticsBagTagRoutes);
logisticsRoutes.use("/admin/pickup-board", logisticsPickupBoardRoutes);
logisticsRoutes.use("/admin/rider-tasks", logisticsRiderTaskAdminRoutes);
logisticsRoutes.use("/admin/partners/:partnerId/webhook-receipts", partnerWebhookReceiptRoutes);
logisticsRoutes.use("/admin/partners", logisticsPartnerRoutes);
logisticsRoutes.use("/hub", logisticsHubOperationRoutes);
logisticsRoutes.use("/hub", logisticsHubShipmentRoutes);
logisticsRoutes.use("/brand/pickup-locations", logisticsPickupLocationRoutes);
logisticsRoutes.use("/brand/pickups", logisticsPickupRoutes);
logisticsRoutes.use("/rider/tasks", logisticsRiderTaskRoutes);
logisticsRoutes.use("/orders/:orderId", logisticsCustomerTrackingRoutes);
