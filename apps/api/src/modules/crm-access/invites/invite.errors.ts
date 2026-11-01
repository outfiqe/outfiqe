import { HTTP_STATUS } from "#constants/http.constants.js";
import { AppError } from "#middlewares/error-handler.js";

export const crmInviteErrors = {
  roleNotFound: () => new AppError("ROLE_NOT_FOUND", "Role not found.", HTTP_STATUS.NOT_FOUND),

  emailInUse: () =>
    new AppError(
      "EMAIL_IN_USE",
      "That email already belongs to a non-staff Outfiqe account and can't be added as staff.",
      HTTP_STATUS.CONFLICT,
    ),

  memberExists: () =>
    new AppError("MEMBER_EXISTS", "This person already has CRM access.", HTTP_STATUS.CONFLICT),

  inviteAlreadyPending: () =>
    new AppError(
      "INVITE_ALREADY_PENDING",
      "An invite is already pending for this email.",
      HTTP_STATUS.CONFLICT,
    ),

  seatLimitReached: () =>
    new AppError(
      "SEAT_LIMIT_REACHED",
      "You've used every seat on your current plan. Upgrade your plan or free up a seat to invite someone new.",
      HTTP_STATUS.CONFLICT,
    ),
};
