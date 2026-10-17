import { logisticsBagTagRepository } from "./bag-tags/bag-tag.repository.js";
import { logisticsHubRepository } from "./hubs/hub.repository.js";
import { logisticsPickupLocationRepository } from "./pickup-locations/pickup-location.repository.js";
import { logisticsRiderRepository } from "./riders/rider.repository.js";
import { logisticsRoundRepository } from "./rounds/rounds.repository.js";
import { logisticsTrackingRepository } from "./tracking/tracking.repository.js";

export const logisticsRepository = {
  ...logisticsTrackingRepository,
  ...logisticsHubRepository,
  ...logisticsPickupLocationRepository,
  ...logisticsRiderRepository,
  ...logisticsBagTagRepository,
  ...logisticsRoundRepository,
};
