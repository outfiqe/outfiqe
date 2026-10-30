import { HTTP_STATUS } from "#constants/http.constants.js";
import { AppError } from "#middlewares/error-handler.js";

export const platformImpersonationErrors = {
  targetNotAMember: () =>
    new AppError(
      "TARGET_NOT_A_MEMBER",
      "The target account no longer exists.",
      HTTP_STATUS.BAD_REQUEST,
    ),

  sessionNotFound: () =>
    new AppError("SESSION_NOT_FOUND", "Impersonation session not found.", HTTP_STATUS.NOT_FOUND),
};
