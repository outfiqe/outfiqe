import { HTTP_STATUS } from "#constants/http.constants.js";
import { AppError } from "#middlewares/error-handler.js";

export const brandErrors = {
  brandNotFound: () =>
    new AppError("BRAND_NOT_FOUND", "No brand is linked to this account.", HTTP_STATUS.NOT_FOUND),
};
