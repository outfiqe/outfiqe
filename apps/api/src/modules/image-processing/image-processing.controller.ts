import type { Request, Response } from "express";

import { prisma } from "#db/prisma.js";
import { sendSuccess } from "#lib/api-response.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type { GetImageAssetParams } from "./image-processing.schemas.js";
import { imageProcessingService } from "./image-processing.service.js";
import type { UploaderProfile } from "./image-processing.utils.js";

const NO_FILE_STATUS = 422;
const ACCEPTED_STATUS = 202;

const loadUploaderProfile = async (userId: string): Promise<UploaderProfile> => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { role: true, isCreator: true, creatorStatus: true },
  });
  return user;
};

export const imageProcessingController = {
  async upload(req: Request, res: Response) {
    const file = req.file;
    if (!file) {
      throw new AppError("NO_FILE", "Attach an image file.", NO_FILE_STATUS);
    }

    const { userId } = requireAuthPrincipal(res);
    const uploader = await loadUploaderProfile(userId);
    const qualityTier = req.body.qualityTier === "hero" ? "hero" : "standard";

    const asset = await imageProcessingService.submitUpload({
      ownerId: userId,
      uploader,
      tempStorageKey: file.filename,
      qualityTier,
    });

    sendSuccess(res, { asset }, "Image queued for processing.", ACCEPTED_STATUS);
  },

  async getStatus(req: Request, res: Response) {
    const { assetId } = validated.params<GetImageAssetParams>(res);
    const { userId } = requireAuthPrincipal(res);

    const asset = await imageProcessingService.getStatus(assetId, userId);
    sendSuccess(res, { asset }, "Image asset status.");
  },
};
