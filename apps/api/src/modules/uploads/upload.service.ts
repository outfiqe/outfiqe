import { randomUUID } from "node:crypto";
import path from "node:path";

import { imageProcessingService } from "#modules/image-processing/image-processing.service.js";
import { imageTempStorageAdapter } from "#modules/image-processing/image-processing.storage.js";
import { storage } from "#storage/storage.js";
import type { UploadedFile } from "#storage/storage.types.js";

export type PipelineUploadedFile = UploadedFile & { assetId: string };

const submitFileToPipeline = async (
  file: Express.Multer.File,
  ownerId: string,
): Promise<PipelineUploadedFile> => {
  const stored = await storage.upload({
    buffer: file.buffer,
    originalName: file.originalname,
    mimeType: file.mimetype,
  });

  const tempStorageKey = `${randomUUID()}${path.extname(file.originalname)}`;
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
          mimeType: file.mimetype,
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
