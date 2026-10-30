import { HTTP_STATUS } from "#constants/http.constants.js";
import { AppError } from "#middlewares/error-handler.js";

export const chatErrors = {
  notFound: () => new AppError("NOT_FOUND", "User not found.", HTTP_STATUS.NOT_FOUND),

  notFoundConversation: () =>
    new AppError("NOT_FOUND", "Conversation not found.", HTTP_STATUS.NOT_FOUND),
};
