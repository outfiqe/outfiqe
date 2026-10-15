import { Router } from "express";

import { logisticsHubRoutes } from "./hubs/hub.routes.js";
import { logisticsPickupLocationRoutes } from "./pickup-locations/pickup-location.routes.js";
import { logisticsPickupRoutes } from "./pickups/pickup.routes.js";

export const logisticsRoutes = Router();

logisticsRoutes.use("/admin/hubs", logisticsHubRoutes);
logisticsRoutes.use("/brand/pickup-locations", logisticsPickupLocationRoutes);
logisticsRoutes.use("/brand/pickups", logisticsPickupRoutes);
