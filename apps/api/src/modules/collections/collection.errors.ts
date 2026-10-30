import { HTTP_STATUS } from "#constants/http.constants.js";
import { AppError } from "#middlewares/error-handler.js";

export const collectionErrors = {
  notFound: () => new AppError("NOT_FOUND", "Collection not found.", HTTP_STATUS.NOT_FOUND),
};
