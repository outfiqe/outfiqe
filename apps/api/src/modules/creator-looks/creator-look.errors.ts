import { HTTP_STATUS } from "#constants/http.constants.js";
import { AppError } from "#middlewares/error-handler.js";

import { VALIDATION_STATUS } from "./creator-look.constants.js";

export const creatorLookErrors = {
  dropNotFound: () =>
    new AppError("LOOK_NOT_FOUND", "This drop no longer exists.", HTTP_STATUS.NOT_FOUND),

  tooManyTaggedProducts: (maxTaggedProducts: number) =>
    new AppError(
      "TOO_MANY_TAGGED_PRODUCTS",
      `A look can tag up to ${maxTaggedProducts} products.`,
      VALIDATION_STATUS,
    ),

  productNotAvailable: () =>
    new AppError(
      "PRODUCT_NOT_AVAILABLE",
      "One or more tagged products aren't available.",
      HTTP_STATUS.NOT_FOUND,
    ),

  imageRequired: () =>
    new AppError("VALIDATION_ERROR", "At least one image is required.", VALIDATION_STATUS),
};
