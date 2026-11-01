import { HTTP_STATUS } from "#constants/http.constants.js";
import { AppError } from "#middlewares/error-handler.js";

export const crmActivitiesErrors = {
  taskNotFound: () => new AppError("TASK_NOT_FOUND", "Task not found.", HTTP_STATUS.NOT_FOUND),
};
