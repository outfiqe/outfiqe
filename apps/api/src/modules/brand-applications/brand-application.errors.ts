import { HTTP_STATUS } from "#constants/http.constants.js";
import { AppError } from "#middlewares/error-handler.js";

export const brandApplicationErrors = {
  alreadyReviewed: () =>
    new AppError(
      "ALREADY_REVIEWED",
      "This application has already been reviewed.",
      HTTP_STATUS.CONFLICT,
    ),
};
