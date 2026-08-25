import type { ImageAssetRecord, QualityTier } from "@outfiqe/image-pipeline";
import { computeChecksum } from "@outfiqe/image-pipeline";

import { AppError } from "#middlewares/error-handler.js";

import { enqueueImageProcessingJob } from "./image-processing.queue.js";
import {
  imageProcessingRepository,
  prismaImageAssetRepository,
} from "./image-processing.repository.js";
import { imageOutputStorageAdapter, imageTempStorageAdapter } from "./image-processing.storage.js";
import type { PublicImageAsset, PublicImageVariant } from "./image-processing.types.js";
import type { UploaderProfile } from "./image-processing.utils.js";
import { resolvePriorityTier } from "./image-processing.utils.js";

const NOT_FOUND_STATUS = 404;

export type SubmitUploadInput = {
  ownerId: string;
  uploader: UploaderProfile;
  tempStorageKey: string;
  qualityTier: QualityTier;
};

export const imageProcessingService = {
  async submitUpload(input: SubmitUploadInput): Promise<PublicImageAsset> {
    const { ownerId, uploader, tempStorageKey, qualityTier } = input;

    const uploadedBuffer = await imageTempStorageAdapter.get(tempStorageKey);
    const checksum = computeChecksum(uploadedBuffer);

    const existing = await imageProcessingRepository.findByOwnerAndChecksum(ownerId, checksum);
    if (existing) {
      await imageTempStorageAdapter.delete(tempStorageKey);
      return toPublicImageAsset(existing);
    }

    const priorityTier = resolvePriorityTier(uploader);
    const asset = await imageProcessingRepository.create({
      ownerId,
      checksum,
      tempStorageKey,
      priorityTier,
      qualityTier,
    });

    await enqueueImageProcessingJob({
      assetId: asset.id,
      ownerId,
      checksum,
      tempStorageKey,
      priorityTier,
      qualityTier,
    });

    return toPublicImageAsset(asset);
  },

  async getStatus(assetId: string, ownerId: string): Promise<PublicImageAsset> {
    const asset = await prismaImageAssetRepository.findById(assetId).catch(() => null);
    if (!asset || asset.ownerId !== ownerId) {
      throw new AppError("IMAGE_ASSET_NOT_FOUND", "Image asset not found.", NOT_FOUND_STATUS);
    }
    return toPublicImageAsset(asset);
  },
};

const toPublicImageAsset = async (asset: ImageAssetRecord): Promise<PublicImageAsset> => {
  const { id, status, encodedVariants, thumbnailStorageKey, lqip, errorMessage } = asset;

  const variants: PublicImageVariant[] = await Promise.all(
    (encodedVariants ?? []).map(async ({ width, format, storageKey }) => ({
      width,
      format,
      url: await imageOutputStorageAdapter.getSignedUrl(storageKey),
    })),
  );

  const thumbnailUrl = thumbnailStorageKey
    ? await imageOutputStorageAdapter.getSignedUrl(thumbnailStorageKey)
    : null;

  return { id, status, variants, thumbnailUrl, lqip, errorMessage };
};
