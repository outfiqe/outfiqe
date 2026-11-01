import { randomUUID } from "node:crypto";

import { HTTP_STATUS } from "#constants/http.constants.js";
import {
  detectImageMimeType,
  imageExtensionForMimeType,
  type ImageMimeType,
} from "#lib/image-type.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { imageProcessingService } from "#modules/image-processing/image-processing.service.js";
import { imageTempStorageAdapter } from "#modules/image-processing/image-processing.storage.js";
import { storage } from "#storage/storage.js";
import type { UploadedFile } from "#storage/storage.types.js";

export type PipelineUploadedFile = UploadedFile & { assetId: string };

const detectedImageTypeOrReject = (file: Express.Multer.File): ImageMimeType => {
  const detectedMimeType = detectImageMimeType(file.buffer);
  if (!detectedMimeType) {
    throw new AppError(
      "INVALID_FILE",
      "Only JPEG, PNG or WebP images are allowed.",
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
    );
  }
  return detectedMimeType;
};

const submitFileToPipeline = async (
  file: Express.Multer.File,
  ownerId: string,
): Promise<PipelineUploadedFile> => {
  const detectedMimeType = detectedImageTypeOrReject(file);
  const stored = await storage.upload({
    buffer: file.buffer,
    originalName: file.originalname,
    mimeType: detectedMimeType,
  });

  const tempStorageKey = `${randomUUID()}${imageExtensionForMimeType(detectedMimeType)}`;
  await imageTempStorageAdapter.put(tempStorageKey, file.buffer);

  const asset = await imageProcessingService.submitUploadForOwner({
    ownerId,
    tempStorageKey,
    qualityTier: "standard",
  });

  return { ...stored, assetId: asset.id };
};

export const uploadService = {
  async uploadFiles(files: Express.Multer.File[]): Promise<UploadedFile[]> {
    return Promise.all(
      files.map((file) =>
        storage.upload({
          buffer: file.buffer,
          originalName: file.originalname,
          mimeType: detectedImageTypeOrReject(file),
        }),
      ),
    );
  },

  async uploadFilesThroughPipeline(
    files: Express.Multer.File[],
    ownerId: string,
  ): Promise<PipelineUploadedFile[]> {
    return Promise.all(files.map((file) => submitFileToPipeline(file, ownerId)));
  },
};
