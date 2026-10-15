import { logisticsHubRepository } from "./hubs/hub.repository.js";
import { logisticsPickupLocationRepository } from "./pickup-locations/pickup-location.repository.js";
import { logisticsTrackingRepository } from "./tracking/tracking.repository.js";

export const logisticsRepository = {
  ...logisticsTrackingRepository,
  ...logisticsHubRepository,
  ...logisticsPickupLocationRepository,
};
