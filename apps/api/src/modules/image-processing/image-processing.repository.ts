import type {
  ImageAssetRecord,
  ImageAssetRepository,
  ImageJobPriorityTier,
  QualityTier,
} from "@outfiqe/image-pipeline";

import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import { ImageProcessingStatus } from "#generated/prisma/enums.js";

import { fromPriorityTier, fromQualityTier, toImageAssetRecord } from "./image-processing.utils.js";

export type CreateImageProcessingAssetInput = {
  ownerId: string;
  checksum: string;
  tempStorageKey: string;
  priorityTier: ImageJobPriorityTier;
  qualityTier: QualityTier;
};

export const imageProcessingRepository = {
  async findByOwnerAndChecksum(
    ownerId: string,
    checksum: string,
  ): Promise<ImageAssetRecord | null> {
    const row = await prisma.imageProcessingAsset.findUnique({
      where: { ownerId_checksum: { ownerId, checksum } },
    });
    return row ? toImageAssetRecord(row) : null;
  },

  async findByIdForOwner(assetId: string, ownerId: string): Promise<ImageAssetRecord | null> {
    const row = await prisma.imageProcessingAsset.findFirst({ where: { id: assetId, ownerId } });
    return row ? toImageAssetRecord(row) : null;
  },

  async create(input: CreateImageProcessingAssetInput): Promise<ImageAssetRecord> {
    const { ownerId, checksum, tempStorageKey, priorityTier, qualityTier } = input;
    const row = await prisma.imageProcessingAsset.create({
      data: {
        ownerId,
        checksum,
        tempStorageKey,
        priorityTier: fromPriorityTier(priorityTier),
        qualityTier: fromQualityTier(qualityTier),
      },
    });
    return toImageAssetRecord(row);
  },
} as const;

export const prismaImageAssetRepository: ImageAssetRepository = {
  async findById(assetId: string): Promise<ImageAssetRecord> {
    const row = await prisma.imageProcessingAsset.findUniqueOrThrow({ where: { id: assetId } });
    return toImageAssetRecord(row);
  },

  async markProcessing(assetId: string): Promise<void> {
    await prisma.imageProcessingAsset.update({
      where: { id: assetId },
      data: { status: ImageProcessingStatus.PROCESSING },
    });
  },

  async markIngestCompleted(assetId: string, originalStorageKey: string): Promise<void> {
    await prisma.imageProcessingAsset.update({
      where: { id: assetId },
      data: { originalStorageKey },
    });
  },

  async markResizeCompleted(assetId, variants): Promise<void> {
    await prisma.imageProcessingAsset.update({
      where: { id: assetId },
      data: { resizedVariants: variants as Prisma.InputJsonValue },
    });
  },

  async markOptimizeCompleted(assetId, variants): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const current = await tx.imageProcessingAsset.findUniqueOrThrow({ where: { id: assetId } });
      await tx.imageProcessingAsset.update({
        where: { id: assetId },
        data: {
          encodedVariants: variants as Prisma.InputJsonValue,
          optimizeCompletedAt: new Date(),
          status: current.thumbnailCompletedAt ? ImageProcessingStatus.COMPLETED : current.status,
        },
      });
    });
  },

  async markThumbnailCompleted(assetId, result): Promise<void> {
    const { thumbnailStorageKey, lqip } = result;
    await prisma.$transaction(async (tx) => {
      const current = await tx.imageProcessingAsset.findUniqueOrThrow({ where: { id: assetId } });
      await tx.imageProcessingAsset.update({
        where: { id: assetId },
        data: {
          thumbnailStorageKey,
          lqip,
          thumbnailCompletedAt: new Date(),
          status: current.optimizeCompletedAt ? ImageProcessingStatus.COMPLETED : current.status,
        },
      });
    });
  },

  async markTempFileCleanedUp(assetId: string): Promise<void> {
    await prisma.imageProcessingAsset.update({
      where: { id: assetId },
      data: { tempFileCleanedUp: true },
    });
  },

  async markFailed(assetId: string, errorMessage: string): Promise<void> {
    await prisma.imageProcessingAsset.update({
      where: { id: assetId },
      data: { status: ImageProcessingStatus.FAILED, errorMessage },
    });
  },
};
