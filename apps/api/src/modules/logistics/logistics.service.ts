import { logisticsFlowService } from "./flow/flow.service.js";
import { logisticsHubService } from "./hubs/hub.service.js";
import { logisticsPickupLocationService } from "./pickup-locations/pickup-location.service.js";
import { logisticsPickupService } from "./pickups/pickup.service.js";
import { logisticsTrackingService } from "./tracking/tracking.service.js";

export const logisticsService = {
  ...logisticsTrackingService,
  ...logisticsFlowService,
  ...logisticsHubService,
  ...logisticsPickupLocationService,
  ...logisticsPickupService,
};
