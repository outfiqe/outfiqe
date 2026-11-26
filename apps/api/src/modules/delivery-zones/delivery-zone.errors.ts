import { HTTP_STATUS } from "#constants/http.constants.js";
import { AppError } from "#middlewares/error-handler.js";

const CITY_FIELD_PATH = "city";
const CITY_NOT_DELIVERABLE_MESSAGE = "We don't deliver to this area yet";

export const deliveryZoneErrors = {
  cityNotDeliverable: () =>
    new AppError("VALIDATION_ERROR", "Invalid request", HTTP_STATUS.UNPROCESSABLE_ENTITY, [
      { code: "custom", path: [CITY_FIELD_PATH], message: CITY_NOT_DELIVERABLE_MESSAGE },
    ]),

  zoneNotFound: () =>
    new AppError("ZONE_NOT_FOUND", "Delivery zone not found.", HTTP_STATUS.NOT_FOUND),
};
