import { HTTP_STATUS } from "#constants/http.constants.js";
import { AppError } from "#middlewares/error-handler.js";

export const tagReviewErrors = {
  notFound: () =>
    new AppError(
      "TAG_REVIEW_NOT_FOUND",
      "This tag review no longer exists.",
      HTTP_STATUS.NOT_FOUND,
    ),

  invalidTransition: () =>
    new AppError(
      "TAG_REVIEW_INVALID_TRANSITION",
      "This tag is no longer in a state you can change.",
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
    ),

  alreadyResolved: () =>
    new AppError(
      "TAG_REVIEW_ALREADY_RESOLVED",
      "Someone already reviewed this tag — refresh to see its current status.",
      HTTP_STATUS.CONFLICT,
    ),
};
