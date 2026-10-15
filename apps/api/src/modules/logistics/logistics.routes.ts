import { Router } from "express";

import { logisticsHubRoutes } from "./hubs/hub.routes.js";
import { logisticsPickupLocationRoutes } from "./pickup-locations/pickup-location.routes.js";

export const logisticsRoutes = Router();

logisticsRoutes.use("/admin/hubs", logisticsHubRoutes);
logisticsRoutes.use("/brand/pickup-locations", logisticsPickupLocationRoutes);
