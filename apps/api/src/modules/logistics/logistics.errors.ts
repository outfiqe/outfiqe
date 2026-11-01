import { HTTP_STATUS } from "#constants/http.constants.js";
import { AppError } from "#middlewares/error-handler.js";

export const logisticsErrors = {
  hubNotOpen: () => new AppError("HUB_NOT_FOUND", "That hub isn't open.", HTTP_STATUS.NOT_FOUND),

  partnerNotFound: () =>
    new AppError("PARTNER_NOT_FOUND", "Delivery partner not found.", HTTP_STATUS.NOT_FOUND),

  orderNotFound: () => new AppError("ORDER_NOT_FOUND", "Order not found.", HTTP_STATUS.NOT_FOUND),

  parcelNotFound: () =>
    new AppError("PARCEL_NOT_FOUND", "Parcel not found.", HTTP_STATUS.NOT_FOUND),

  pickupNotFound: () =>
    new AppError("PICKUP_NOT_FOUND", "Pickup not found.", HTTP_STATUS.NOT_FOUND),

  parcelAlreadyLeft: () =>
    new AppError(
      "PARCEL_ALREADY_LEFT",
      "This parcel has already left the hub, so its booking can't be changed here.",
      HTTP_STATUS.CONFLICT,
    ),

  bookingChanged: () =>
    new AppError(
      "BOOKING_CHANGED",
      "This booking was changed by someone else. Refresh and try again.",
      HTTP_STATUS.CONFLICT,
    ),

  hubNotFound: () => new AppError("HUB_NOT_FOUND", "Hub not found.", HTTP_STATUS.NOT_FOUND),

  noRiderProfile: () =>
    new AppError("RIDER_NOT_FOUND", "No rider profile for this account.", HTTP_STATUS.FORBIDDEN),

  pickupLocationNotFound: () =>
    new AppError("PICKUP_LOCATION_NOT_FOUND", "Pickup location not found.", HTTP_STATUS.NOT_FOUND),

  parcelReturnAlreadyCheckedIn: () =>
    new AppError(
      "PARCEL_RETURN_ALREADY_CHECKED_IN",
      "This parcel's return has already been checked in.",
      HTTP_STATUS.CONFLICT,
    ),

  riderNotFound: () => new AppError("RIDER_NOT_FOUND", "Rider not found.", HTTP_STATUS.NOT_FOUND),

  riderTaskNotFound: () =>
    new AppError("RIDER_TASK_NOT_FOUND", "Visit not found.", HTTP_STATUS.NOT_FOUND),

  riderTaskClosed: () =>
    new AppError("RIDER_TASK_CLOSED", "This visit is already finished.", HTTP_STATUS.CONFLICT),
};
