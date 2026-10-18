import { logisticsCheckInService } from "./check-in.service.js";
import { logisticsHandoverService } from "./handover.service.js";
import { logisticsInspectionService } from "./inspection.service.js";
import { logisticsPackingService } from "./packing.service.js";
import { logisticsParcelBookingService } from "./parcel-booking.service.js";

export const logisticsHubOperationService = {
  ...logisticsCheckInService,
  ...logisticsInspectionService,
  ...logisticsPackingService,
  ...logisticsParcelBookingService,
  ...logisticsHandoverService,
};
