import { HTTP_STATUS } from "#constants/http.constants.js";
import { AppError } from "#middlewares/error-handler.js";

export const productReviewErrors = {
  reviewNotFound: () =>
    new AppError("REVIEW_NOT_FOUND", "This review no longer exists.", HTTP_STATUS.NOT_FOUND),
};
