import { HTTP_STATUS } from "#constants/http.constants.js";
import { AppError } from "#middlewares/error-handler.js";

export const crmAccessErrors = {
  membershipNotFound: () =>
    new AppError("MEMBERSHIP_NOT_FOUND", "Member not found.", HTTP_STATUS.NOT_FOUND),

  roleNotFound: () => new AppError("ROLE_NOT_FOUND", "Role not found.", HTTP_STATUS.NOT_FOUND),

  memberExists: () =>
    new AppError("MEMBER_EXISTS", "You already have CRM access.", HTTP_STATUS.CONFLICT),

  transferInvalid: () =>
    new AppError(
      "TRANSFER_INVALID",
      "This ownership transfer is no longer available.",
      HTTP_STATUS.CONFLICT,
    ),

  transferUserMismatch: () =>
    new AppError(
      "TRANSFER_USER_MISMATCH",
      "This ownership transfer wasn't addressed to you.",
      HTTP_STATUS.FORBIDDEN,
    ),

  roleInUse: () =>
    new AppError(
      "ROLE_IN_USE",
      "Reassign every member on this role before deleting it.",
      HTTP_STATUS.CONFLICT,
    ),
};
