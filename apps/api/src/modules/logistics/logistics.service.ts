import { logisticsBagTagService } from "./bag-tags/bag-tag.service.js";
import { logisticsFlowService } from "./flow/flow.service.js";
import { logisticsHubService } from "./hubs/hub.service.js";
import { logisticsPickupLocationService } from "./pickup-locations/pickup-location.service.js";
import { logisticsPickupService } from "./pickups/pickup.service.js";
import { logisticsRiderService } from "./riders/rider.service.js";
import { logisticsRiderTaskService } from "./rounds/rider-task.service.js";
import { logisticsRoundService } from "./rounds/rounds.service.js";
import { logisticsTrackingService } from "./tracking/tracking.service.js";

export const logisticsService = {
  ...logisticsTrackingService,
  ...logisticsFlowService,
  ...logisticsHubService,
  ...logisticsPickupLocationService,
  ...logisticsPickupService,
  ...logisticsRiderService,
  ...logisticsBagTagService,
  ...logisticsRoundService,
  ...logisticsRiderTaskService,
};
