import { HTTP_STATUS } from "#constants/http.constants.js";
import { AppError } from "#middlewares/error-handler.js";

export const authErrors = {
  inviteExpired: () =>
    new AppError(
      "INVITE_EXPIRED",
      "This invite link has expired. Please contact us for a new one.",
      HTTP_STATUS.BAD_REQUEST,
    ),

  inviteUsed: () =>
    new AppError("INVITE_USED", "This invite link has already been used.", HTTP_STATUS.BAD_REQUEST),

  phoneExists: () =>
    new AppError(
      "PHONE_EXISTS",
      "An account with this phone number already exists.",
      HTTP_STATUS.CONFLICT,
    ),

  userExists: () =>
    new AppError("USER_EXISTS", "An account with this email already exists.", HTTP_STATUS.CONFLICT),

  invalidInvite: () =>
    new AppError("INVALID_INVITE", "This invite link is not valid.", HTTP_STATUS.BAD_REQUEST),

  inviteInvalidOrAlreadyUsed: () =>
    new AppError(
      "INVALID_INVITE",
      "This invite link is not valid or has already been used.",
      HTTP_STATUS.BAD_REQUEST,
    ),

  invalidCredentials: () =>
    new AppError("INVALID_CREDENTIALS", "Incorrect password.", HTTP_STATUS.UNAUTHORIZED),

  missingToken: () =>
    new AppError("MISSING_TOKEN", "No refresh token provided.", HTTP_STATUS.UNAUTHORIZED),

  invalidToken: () =>
    new AppError("INVALID_TOKEN", "Refresh token is invalid.", HTTP_STATUS.UNAUTHORIZED),

  tokenExpired: () =>
    new AppError(
      "TOKEN_EXPIRED",
      "Refresh token has expired. Please sign in again.",
      HTTP_STATUS.UNAUTHORIZED,
    ),
};
