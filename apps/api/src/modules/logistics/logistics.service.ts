import { logisticsAlertService } from "./alerts/alert.service.js";
import { logisticsBagTagService } from "./bag-tags/bag-tag.service.js";
import { logisticsCodService } from "./cod/cod.service.js";
import { logisticsCustomerTrackingService } from "./customer-tracking/customer-tracking.service.js";
import { logisticsFlowService } from "./flow/flow.service.js";
import { logisticsHubOperationService } from "./hub-operations/hub-operation.service.js";
import { logisticsHubService } from "./hubs/hub.service.js";
import { logisticsPartnerBookingService } from "./partner-bookings/partner-booking.service.js";
import { logisticsPartnerPollingService } from "./partner-webhooks/partner-polling.service.js";
import { logisticsPartnerWebhookService } from "./partner-webhooks/partner-webhook.service.js";
import { logisticsPartnerService } from "./partners/partner.service.js";
import { logisticsPartnerStatusImportService } from "./partners/partner-status-import.service.js";
import { logisticsPickupLocationService } from "./pickup-locations/pickup-location.service.js";
import { logisticsPickupService } from "./pickups/pickup.service.js";
import { logisticsRefusalService } from "./refusals/refusal.service.js";
import { logisticsReliabilityService } from "./reliability/reliability.service.js";
import { logisticsBrandReturnService } from "./returns/brand-return.service.js";
import { logisticsLostParcelService } from "./returns/lost-parcel.service.js";
import { logisticsReturnCheckInService } from "./returns/return-check-in.service.js";
import { logisticsRiderPayService } from "./rider-pay/rider-pay.service.js";
import { logisticsRiderService } from "./riders/rider.service.js";
import { logisticsRiderTaskService } from "./rounds/rider-task.service.js";
import { logisticsRoundService } from "./rounds/rounds.service.js";
import { logisticsShipmentService } from "./shipments/shipment.service.js";
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
  ...logisticsPartnerService,
  ...logisticsPartnerStatusImportService,
  ...logisticsHubOperationService,
  ...logisticsShipmentService,
  ...logisticsPartnerBookingService,
  ...logisticsPartnerWebhookService,
  ...logisticsPartnerPollingService,
  ...logisticsCustomerTrackingService,
  ...logisticsReturnCheckInService,
  ...logisticsLostParcelService,
  ...logisticsBrandReturnService,
  ...logisticsRefusalService,
  ...logisticsReliabilityService,
  ...logisticsCodService,
  ...logisticsRiderPayService,
  ...logisticsAlertService,
};
