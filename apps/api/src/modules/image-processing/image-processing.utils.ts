import type { ImageAssetRecord, ImageJobPriorityTier, QualityTier } from "@outfiqe/image-pipeline";
import { z } from "zod";

import type { ImageProcessingAsset } from "#generated/prisma/client.js";
import {
  CreatorStatus,
  ImageProcessingPriorityTier,
  ImageProcessingQualityTier,
  ImageProcessingStatus,
  UserRole,
} from "#generated/prisma/enums.js";

export type UploaderProfile = {
  role: UserRole;
  isCreator: boolean;
  creatorStatus: CreatorStatus;
};

export const resolvePriorityTier = (uploader: UploaderProfile): ImageJobPriorityTier => {
  if (uploader.role === UserRole.ADMIN) {
    return "bulkAdmin";
  }
  if (uploader.isCreator && uploader.creatorStatus === CreatorStatus.APPROVED) {
    return "paidCreator";
  }
  return "standard";
};

const resizedVariantsSchema = z.array(z.object({ width: z.number(), storageKey: z.string() }));
const encodedVariantsSchema = z.array(
  z.object({
    width: z.number(),
    format: z.enum(["avif", "webp", "jpeg"]),
    storageKey: z.string(),
    bytes: z.number(),
  }),
);

const toResizedVariants = (value: unknown): ImageAssetRecord["resizedVariants"] => {
  if (value === null || value === undefined) return null;
  return resizedVariantsSchema.parse(value);
};

const toEncodedVariants = (value: unknown): ImageAssetRecord["encodedVariants"] => {
  if (value === null || value === undefined) return null;
  return encodedVariantsSchema.parse(value);
};

const toPriorityTier = (value: ImageProcessingAsset["priorityTier"]): ImageJobPriorityTier => {
  switch (value) {
    case ImageProcessingPriorityTier.PAID_CREATOR:
      return "paidCreator";
    case ImageProcessingPriorityTier.BULK_ADMIN:
      return "bulkAdmin";
    case ImageProcessingPriorityTier.STANDARD:
      return "standard";
  }
};

const toQualityTier = (value: ImageProcessingAsset["qualityTier"]): QualityTier =>
  value === ImageProcessingQualityTier.HERO ? "hero" : "standard";

const toAssetStatus = (value: ImageProcessingAsset["status"]): ImageAssetRecord["status"] => {
  switch (value) {
    case ImageProcessingStatus.PENDING:
      return "pending";
    case ImageProcessingStatus.PROCESSING:
      return "processing";
    case ImageProcessingStatus.COMPLETED:
      return "completed";
    case ImageProcessingStatus.FAILED:
      return "failed";
  }
};

export const fromPriorityTier = (tier: ImageJobPriorityTier): ImageProcessingPriorityTier => {
  switch (tier) {
    case "paidCreator":
      return ImageProcessingPriorityTier.PAID_CREATOR;
    case "bulkAdmin":
      return ImageProcessingPriorityTier.BULK_ADMIN;
    case "standard":
      return ImageProcessingPriorityTier.STANDARD;
  }
};

export const fromQualityTier = (tier: QualityTier): ImageProcessingQualityTier =>
  tier === "hero" ? ImageProcessingQualityTier.HERO : ImageProcessingQualityTier.STANDARD;

export const toImageAssetRecord = (row: ImageProcessingAsset): ImageAssetRecord => ({
  id: row.id,
  ownerId: row.ownerId,
  checksum: row.checksum,
  priorityTier: toPriorityTier(row.priorityTier),
  qualityTier: toQualityTier(row.qualityTier),
  status: toAssetStatus(row.status),
  tempStorageKey: row.tempStorageKey,
  tempFileCleanedUp: row.tempFileCleanedUp,
  originalStorageKey: row.originalStorageKey,
  resizedVariants: toResizedVariants(row.resizedVariants),
  encodedVariants: toEncodedVariants(row.encodedVariants),
  thumbnailStorageKey: row.thumbnailStorageKey,
  lqip: row.lqip,
  optimizeCompletedAt: row.optimizeCompletedAt,
  thumbnailCompletedAt: row.thumbnailCompletedAt,
  errorMessage: row.errorMessage,
});
