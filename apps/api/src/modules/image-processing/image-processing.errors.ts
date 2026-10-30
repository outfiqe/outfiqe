import { HTTP_STATUS } from "#constants/http.constants.js";
import { AppError } from "#middlewares/error-handler.js";

export const imageProcessingErrors = {
  imageAssetNotFound: () =>
    new AppError("IMAGE_ASSET_NOT_FOUND", "Image asset not found.", HTTP_STATUS.NOT_FOUND),
};
