import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import {
  ImageProcessingStatus,
  OutfitPhotoKind,
  OutfitPhotoStatus,
} from "#generated/prisma/enums.js";
import { RESPONSIVE_IMAGE_ASSET_SELECT } from "#lib/responsive-image.utils.js";
import type { DbClient } from "#types/db.types.js";

import { outfitPersonSelect } from "./outfit.repository.js";

const ACTIVE_PHOTO_STATUSES = [OutfitPhotoStatus.PROCESSING, OutfitPhotoStatus.READY];
const NO_ROWS = 0;

export const outfitPhotoSelect = {
  id: true,
  kind: true,
  status: true,
  imageUrl: true,
  coverPosition: true,
  createdAt: true,
  uploader: { select: outfitPersonSelect },
  imageAsset: { select: RESPONSIVE_IMAGE_ASSET_SELECT },
} as const satisfies Prisma.OutfitPhotoSelect;

export type OutfitPhotoRow = Prisma.OutfitPhotoGetPayload<{ select: typeof outfitPhotoSelect }>;

export type NewOutfitPhoto = {
  imageUrl: string;
  imageAssetId: string;
  status: OutfitPhotoStatus;
};

export const outfitPhotoRepository = {
  countActiveByUploader(tx: Prisma.TransactionClient, outfitId: string, uploaderId: string) {
    return tx.outfitPhoto.count({
      where: { outfitId, uploaderId, status: { in: ACTIVE_PHOTO_STATUSES } },
    });
  },

  countActiveOnBoard(tx: Prisma.TransactionClient, outfitId: string) {
    return tx.outfitPhoto.count({ where: { outfitId, status: { in: ACTIVE_PHOTO_STATUSES } } });
  },

  countAssetsAlreadyUsed(tx: Prisma.TransactionClient, imageAssetIds: string[]) {
    return tx.outfitPhoto.count({ where: { imageAssetId: { in: imageAssetIds } } });
  },

  async findCompletedAssetIds(
    tx: Prisma.TransactionClient,
    imageAssetIds: string[],
  ): Promise<Set<string>> {
    const completedAssets = await tx.imageProcessingAsset.findMany({
      where: { id: { in: imageAssetIds }, status: ImageProcessingStatus.COMPLETED },
      select: { id: true },
    });
    return new Set(completedAssets.map(({ id }) => id));
  },

  async createMany(
    tx: Prisma.TransactionClient,
    { outfitId, uploaderId, kind }: { outfitId: string; uploaderId: string; kind: OutfitPhotoKind },
    newPhotos: NewOutfitPhoto[],
  ): Promise<string[]> {
    const createdPhotos = await tx.outfitPhoto.createManyAndReturn({
      data: newPhotos.map(({ imageUrl, imageAssetId, status }) => ({
        outfitId,
        uploaderId,
        kind,
        imageUrl,
        imageAssetId,
        status,
      })),
      select: { id: true },
    });
    return createdPhotos.map(({ id }) => id);
  },

  findActive(tx: Prisma.TransactionClient, outfitId: string, photoId: string) {
    return tx.outfitPhoto.findFirst({
      where: { id: photoId, outfitId, status: { in: ACTIVE_PHOTO_STATUSES } },
      select: { id: true, uploaderId: true, kind: true },
    });
  },

  async markRemoved(
    client: DbClient,
    photoId: string,
    removedById: string | null,
  ): Promise<boolean> {
    const { count } = await client.outfitPhoto.updateMany({
      where: { id: photoId, status: { in: ACTIVE_PHOTO_STATUSES } },
      data: {
        status: OutfitPhotoStatus.REMOVED,
        removedAt: new Date(),
        removedById,
        coverPosition: null,
      },
    });
    return count > NO_ROWS;
  },

  countCoverEligible(tx: Prisma.TransactionClient, outfitId: string, photoIds: string[]) {
    return tx.outfitPhoto.count({
      where: {
        id: { in: photoIds },
        outfitId,
        kind: OutfitPhotoKind.COVER,
        status: { in: ACTIVE_PHOTO_STATUSES },
      },
    });
  },

  async replaceCovers(
    tx: Prisma.TransactionClient,
    outfitId: string,
    orderedPhotoIds: string[],
  ): Promise<void> {
    await tx.outfitPhoto.updateMany({
      where: { outfitId, coverPosition: { not: null } },
      data: { coverPosition: null },
    });
    for (const [coverPosition, photoId] of orderedPhotoIds.entries()) {
      await tx.outfitPhoto.update({ where: { id: photoId }, data: { coverPosition } });
    }
  },

  listForBoard(client: DbClient, outfitId: string): Promise<OutfitPhotoRow[]> {
    return client.outfitPhoto.findMany({
      where: { outfitId, status: { in: ACTIVE_PHOTO_STATUSES } },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: outfitPhotoSelect,
    });
  },

  listCoversForBuilds(outfitIds: string[]): Promise<(OutfitPhotoRow & { outfitId: string })[]> {
    if (outfitIds.length === NO_ROWS) return Promise.resolve([]);
    return prisma.outfitPhoto.findMany({
      where: {
        outfitId: { in: outfitIds },
        kind: OutfitPhotoKind.COVER,
        status: { in: ACTIVE_PHOTO_STATUSES },
        coverPosition: { not: null },
      },
      orderBy: [{ outfitId: "asc" }, { coverPosition: "asc" }],
      select: { ...outfitPhotoSelect, outfitId: true },
    });
  },

  async markProcessedPhotosReady(): Promise<number> {
    const { count } = await prisma.outfitPhoto.updateMany({
      where: {
        status: OutfitPhotoStatus.PROCESSING,
        imageAsset: { status: ImageProcessingStatus.COMPLETED },
      },
      data: { status: OutfitPhotoStatus.READY },
    });
    return count;
  },

  async removeUnconfirmedPhotos(createdBefore: Date, batchSize: number): Promise<number> {
    const stalePhotos = await prisma.outfitPhoto.findMany({
      where: {
        status: OutfitPhotoStatus.PROCESSING,
        OR: [
          { createdAt: { lt: createdBefore } },
          { imageAsset: { status: ImageProcessingStatus.FAILED } },
        ],
      },
      select: { id: true },
      take: batchSize,
    });
    if (stalePhotos.length === NO_ROWS) return NO_ROWS;
    const { count } = await prisma.outfitPhoto.updateMany({
      where: {
        id: { in: stalePhotos.map(({ id }) => id) },
        status: OutfitPhotoStatus.PROCESSING,
      },
      data: { status: OutfitPhotoStatus.REMOVED, removedAt: new Date(), coverPosition: null },
    });
    return count;
  },
};
