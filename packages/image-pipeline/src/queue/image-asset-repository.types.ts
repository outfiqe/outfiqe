import type { QualityTier } from "../processing/image-processing.types.js";
import type { EncodedVariantDescriptor, ResizedVariantDescriptor } from "./image-job.types.js";
import type { ImageJobPriorityTier } from "./priority.constants.js";

export const IMAGE_ASSET_STATUSES = ["pending", "processing", "completed", "failed"] as const;
export type ImageAssetStatus = (typeof IMAGE_ASSET_STATUSES)[number];

export type ImageAssetRecord = {
  id: string;
  ownerId: string;
  checksum: string;
  priorityTier: ImageJobPriorityTier;
  qualityTier: QualityTier;
  status: ImageAssetStatus;
  tempStorageKey: string;
  tempFileCleanedUp: boolean;
  originalStorageKey: string | null;
  resizedVariants: ResizedVariantDescriptor[] | null;
  encodedVariants: EncodedVariantDescriptor[] | null;
  thumbnailStorageKey: string | null;
  lqip: string | null;
  optimizeCompletedAt: Date | null;
  thumbnailCompletedAt: Date | null;
  errorMessage: string | null;
};

export interface ImageAssetRepository {
  findById(assetId: string): Promise<ImageAssetRecord>;
  markProcessing(assetId: string): Promise<void>;
  markIngestCompleted(assetId: string, originalStorageKey: string): Promise<void>;
  markResizeCompleted(assetId: string, variants: ResizedVariantDescriptor[]): Promise<void>;
  markOptimizeCompleted(assetId: string, variants: EncodedVariantDescriptor[]): Promise<void>;
  markThumbnailCompleted(
    assetId: string,
    result: { thumbnailStorageKey: string; lqip: string },
  ): Promise<void>;
  markTempFileCleanedUp(assetId: string): Promise<void>;
  markFailed(assetId: string, errorMessage: string): Promise<void>;
}

export const isImageAssetFullyComplete = (record: ImageAssetRecord): boolean =>
  record.optimizeCompletedAt !== null && record.thumbnailCompletedAt !== null;
