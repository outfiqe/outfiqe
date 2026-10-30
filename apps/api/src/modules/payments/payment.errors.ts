import { HTTP_STATUS } from "#constants/http.constants.js";
import { AppError } from "#middlewares/error-handler.js";

export const paymentErrors = {
  notFound: () => new AppError("NOT_FOUND", "Order not found.", HTTP_STATUS.NOT_FOUND),

  alreadySettled: () =>
    new AppError("ALREADY_SETTLED", "This order has already been paid.", HTTP_STATUS.CONFLICT),
};
