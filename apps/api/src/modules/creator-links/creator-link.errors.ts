import { HTTP_STATUS } from "#constants/http.constants.js";
import { AppError } from "#middlewares/error-handler.js";

export const creatorLinkErrors = {
  linkNotFound: () =>
    new AppError("LINK_NOT_FOUND", "This link is no longer available.", HTTP_STATUS.NOT_FOUND),
};
