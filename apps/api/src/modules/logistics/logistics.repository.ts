import { logisticsBagTagRepository } from "./bag-tags/bag-tag.repository.js";
import { logisticsHubOperationRepository } from "./hub-operations/hub-operation.repository.js";
import { logisticsHubRepository } from "./hubs/hub.repository.js";
import { logisticsPartnerRepository } from "./partners/partner.repository.js";
import { logisticsPartnerStatusImportRepository } from "./partners/partner-status-import.repository.js";
import { logisticsPickupLocationRepository } from "./pickup-locations/pickup-location.repository.js";
import { logisticsRiderRepository } from "./riders/rider.repository.js";
import { logisticsRoundRepository } from "./rounds/rounds.repository.js";
import { logisticsShipmentRepository } from "./shipments/shipment.repository.js";
import { logisticsShipmentBookingRepository } from "./shipments/shipment-booking.repository.js";
import { logisticsTrackingRepository } from "./tracking/tracking.repository.js";

export const logisticsRepository = {
  ...logisticsTrackingRepository,
  ...logisticsHubRepository,
  ...logisticsPickupLocationRepository,
  ...logisticsRiderRepository,
  ...logisticsBagTagRepository,
  ...logisticsRoundRepository,
  ...logisticsPartnerRepository,
  ...logisticsPartnerStatusImportRepository,
  ...logisticsHubOperationRepository,
  ...logisticsShipmentRepository,
  ...logisticsShipmentBookingRepository,
};
