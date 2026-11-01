import { HTTP_STATUS } from "#constants/http.constants.js";
import { AppError } from "#middlewares/error-handler.js";

export const userErrors = {
  handleTaken: () =>
    new AppError("HANDLE_TAKEN", "That username is already taken.", HTTP_STATUS.CONFLICT),

  phoneExists: () =>
    new AppError(
      "PHONE_EXISTS",
      "An account with this phone number already exists.",
      HTTP_STATUS.CONFLICT,
    ),
};
