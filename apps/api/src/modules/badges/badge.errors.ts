import { HTTP_STATUS } from "#constants/http.constants.js";
import { AppError } from "#middlewares/error-handler.js";

export const badgeErrors = {
  badgeNotFound: () =>
    new AppError("BADGE_NOT_FOUND", "This badge doesn't exist.", HTTP_STATUS.NOT_FOUND),
};
