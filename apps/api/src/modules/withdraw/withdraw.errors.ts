import { HTTP_STATUS } from "#constants/http.constants.js";
import { AppError } from "#middlewares/error-handler.js";

export const withdrawErrors = {
  notFound: () => new AppError("NOT_FOUND", "Withdraw request not found.", HTTP_STATUS.NOT_FOUND),
};
