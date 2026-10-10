import type { Request, Response } from "express";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { sendSuccess } from "#lib/api-response.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type { GetImageAssetParams } from "./image-processing.schemas.js";
import { imageProcessingService } from "./image-processing.service.js";

const NO_FILE_STATUS = HTTP_STATUS.UNPROCESSABLE_ENTITY;

export const imageProcessingController = {
  async upload(req: Request, res: Response) {
    const file = req.file;
    if (!file) {
      throw new AppError("NO_FILE", "Attach an image file.", NO_FILE_STATUS);
    }

    const { userId } = requireAuthPrincipal(res);
    const qualityTier = req.body.qualityTier === "hero" ? "hero" : "standard";

    const asset = await imageProcessingService.submitUploadForOwner({
      ownerId: userId,
      tempStorageKey: file.filename,
      qualityTier,
    });

    sendSuccess(res, { asset }, "Image queued for processing.", HTTP_STATUS.ACCEPTED);
  },

  async getStatus(req: Request, res: Response) {
    const { assetId } = validated.params<GetImageAssetParams>(res);
    const { userId } = requireAuthPrincipal(res);

    const asset = await imageProcessingService.getStatus(assetId, userId);
    sendSuccess(res, { asset }, "Image asset status.");
  },
};
