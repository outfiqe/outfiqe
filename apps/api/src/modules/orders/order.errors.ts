import { HTTP_STATUS } from "#constants/http.constants.js";
import { AppError } from "#middlewares/error-handler.js";

export const orderErrors = {
  notFound: () => new AppError("NOT_FOUND", "Order not found.", HTTP_STATUS.NOT_FOUND),

  invalidTransition: () =>
    new AppError(
      "INVALID_TRANSITION",
      "This order's status changed — refresh and try again.",
      HTTP_STATUS.CONFLICT,
    ),
};
