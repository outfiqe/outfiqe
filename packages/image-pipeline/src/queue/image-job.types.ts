import type { QualityTier } from "../processing/image-processing.types.js";
import type { ImageJobPriorityTier } from "./priority.constants.js";

export type ImageIngestJobData = {
  assetId: string;
  ownerId: string;
  tempStorageKey: string;
  checksum: string;
  priorityTier: ImageJobPriorityTier;
  qualityTier: QualityTier;
};

export type ImageIngestJobResult = {
  originalStorageKey: string;
  checksum: string;
  qualityTier: QualityTier;
};

export type ImageResizeJobData = {
  assetId: string;
};

export type ResizedVariantDescriptor = {
  width: number;
  storageKey: string;
};

export type ImageResizeJobResult = {
  variants: ResizedVariantDescriptor[];
  qualityTier: QualityTier;
};

export type ImageOptimizeJobData = {
  assetId: string;
};

export type EncodedVariantDescriptor = {
  width: number;
  format: "avif" | "webp" | "jpeg";
  storageKey: string;
  bytes: number;
};

export type ImageOptimizeJobResult = {
  variants: EncodedVariantDescriptor[];
};

export type ImageThumbnailJobData = {
  assetId: string;
};

export type ImageThumbnailJobResult = {
  thumbnailStorageKey: string;
  lqip: string;
};
