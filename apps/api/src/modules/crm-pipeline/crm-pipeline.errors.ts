import { HTTP_STATUS } from "#constants/http.constants.js";
import { AppError } from "#middlewares/error-handler.js";

export const crmPipelineErrors = {
  stageNameTaken: () =>
    new AppError(
      "STAGE_NAME_TAKEN",
      "A stage with that name already exists.",
      HTTP_STATUS.CONFLICT,
    ),
};
