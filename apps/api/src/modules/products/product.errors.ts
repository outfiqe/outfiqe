import { HTTP_STATUS } from "#constants/http.constants.js";
import { AppError } from "#middlewares/error-handler.js";

export const productErrors = {
  notFound: () => new AppError("NOT_FOUND", "Product not found.", HTTP_STATUS.NOT_FOUND),

  sizeNotFound: () =>
    new AppError(
      "SIZE_NOT_FOUND",
      "One or more sizes weren't found on this product.",
      HTTP_STATUS.NOT_FOUND,
    ),

  fitRangesNotSupported: () =>
    new AppError(
      "FIT_RANGES_NOT_SUPPORTED",
      "This kind of clothing doesn't take a size chart or a stretch setting.",
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
    ),
};
