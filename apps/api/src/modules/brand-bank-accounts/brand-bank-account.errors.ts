import { HTTP_STATUS } from "#constants/http.constants.js";
import { AppError } from "#middlewares/error-handler.js";

export const brandBankAccountErrors = {
  notFound: () => new AppError("NOT_FOUND", "Bank account not found.", HTTP_STATUS.NOT_FOUND),
};
