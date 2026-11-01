import { HTTP_STATUS } from "#constants/http.constants.js";
import { AppError } from "#middlewares/error-handler.js";

export const deliveryZoneErrors = {
  zoneNotFound: () =>
    new AppError("ZONE_NOT_FOUND", "Delivery zone not found.", HTTP_STATUS.NOT_FOUND),
};
