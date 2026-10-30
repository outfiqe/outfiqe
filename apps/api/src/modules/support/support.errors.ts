import { HTTP_STATUS } from "#constants/http.constants.js";
import { AppError } from "#middlewares/error-handler.js";

export const supportErrors = {
  supportStatusChanged: () =>
    new AppError(
      "SUPPORT_STATUS_CHANGED",
      "This request's status changed under you — reload and try again.",
      HTTP_STATUS.CONFLICT,
    ),

  supportAssigneeChanged: () =>
    new AppError(
      "SUPPORT_ASSIGNEE_CHANGED",
      "This request's assignee changed under you — reload and try again.",
      HTTP_STATUS.CONFLICT,
    ),

  supportPriorityChanged: () =>
    new AppError(
      "SUPPORT_PRIORITY_CHANGED",
      "This request's priority changed under you — reload and try again.",
      HTTP_STATUS.CONFLICT,
    ),
};
