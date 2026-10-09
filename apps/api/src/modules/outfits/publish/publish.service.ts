import { prisma } from "#db/prisma.js";
import { Prisma } from "#generated/prisma/client.js";
import { OutfitStatus } from "#generated/prisma/enums.js";
import { creatorLookRepository } from "#modules/creator-looks/creator-look.repository.js";
import { creatorLookService } from "#modules/creator-looks/creator-look.service.js";
import type { CreatorLookSummary } from "#modules/creator-looks/creator-look.types.js";
import { outfitOfferService } from "#modules/outfit-offers/outfit-offer.service.js";

import { outfitErrors } from "../outfit.errors.js";
import { outfitRepository } from "../outfit.repository.js";
import type { PublishLookBody } from "../outfit.schemas.js";
import { parseSnapshotItems } from "../outfit.utils.js";
import { outfitPublishRepository } from "./publish.repository.js";

const UNIQUE_CONSTRAINT_VIOLATION = "P2002";

export type MyPublishedLookView = {
  lookId: string;
  publishedVersion: number;
  lastLockedVersion: number | null;
  isOutdated: boolean;
};

const isUniqueViolation = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === UNIQUE_CONSTRAINT_VIOLATION;

const requireMember = async (outfitId: string, userId: string): Promise<void> => {
  const memberRole = await outfitRepository.findMemberRole(prisma, outfitId, userId);
  if (!memberRole) throw outfitErrors.notFound();
};

const findExistingLook = async (
  creatorId: string,
  outfitId: string,
  outfitVersion: number,
): Promise<CreatorLookSummary | null> => {
  const lookFromVersion = await outfitPublishRepository.findLookFromVersion(
    creatorId,
    outfitId,
    outfitVersion,
  );
  if (!lookFromVersion) return null;
  if (lookFromVersion.deletedAt) throw outfitErrors.lookFromVersionDeleted();
  return creatorLookRepository.findSummaryById(lookFromVersion.id);
};

const assertSizesCoverEveryItem = (
  snapshotProductIds: string[],
  sizesWorn: PublishLookBody["sizesWorn"],
): void => {
  const sizedProductIds = new Set(sizesWorn.map(({ productId }) => productId));
  const coversEveryItem =
    sizedProductIds.size === snapshotProductIds.length &&
    snapshotProductIds.every((productId) => sizedProductIds.has(productId));
  if (!coversEveryItem) throw outfitErrors.sizesWornMismatch();
};

export const outfitPublishService = {
  async publishAsLook(
    userId: string,
    outfitId: string,
    { sizesWorn, imageUrls, imageAssetIds, caption, layout }: PublishLookBody,
  ): Promise<{ look: CreatorLookSummary; isNew: boolean }> {
    await requireMember(outfitId, userId);
    const outfit = await outfitRepository.findAccess(prisma, outfitId);
    if (!outfit) throw outfitErrors.notFound();
    if (outfit.status !== OutfitStatus.LOCKED) throw outfitErrors.notLocked();

    const lockedVersion = await outfitRepository.findLatestSnapshotVersion(prisma, outfitId);
    if (lockedVersion === null) throw outfitErrors.neverLocked();

    const existingLook = await findExistingLook(userId, outfitId, lockedVersion);
    if (existingLook) return { look: existingLook, isNew: false };

    const snapshot = await outfitRepository.findSnapshot(prisma, outfitId, lockedVersion);
    if (!snapshot) throw outfitErrors.neverLocked();
    const snapshotProductIds = parseSnapshotItems(snapshot.items).map(({ productId }) => productId);
    assertSizesCoverEveryItem(snapshotProductIds, sizesWorn);

    try {
      const look = await creatorLookService.create(
        userId,
        { taggedProducts: sizesWorn, imageUrls, imageAssetIds, caption, layout },
        { outfitId, outfitVersion: lockedVersion },
      );
      await outfitOfferService.recordPostedLook(prisma, {
        creatorId: userId,
        outfitId,
        outfitVersion: lockedVersion,
        lookId: look.id,
      });
      return { look, isNew: true };
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const concurrentLook = await findExistingLook(userId, outfitId, lockedVersion);
      if (!concurrentLook) throw error;
      return { look: concurrentLook, isNew: false };
    }
  },

  async findMyPublishedLook(userId: string, outfitId: string): Promise<MyPublishedLookView | null> {
    await requireMember(outfitId, userId);
    const [latestLook, lastLockedVersion] = await Promise.all([
      outfitPublishRepository.findLatestLookBy(userId, outfitId),
      outfitRepository.findLatestSnapshotVersion(prisma, outfitId),
    ]);
    if (!latestLook) return null;
    return {
      lookId: latestLook.id,
      publishedVersion: latestLook.sourceOutfitVersion,
      lastLockedVersion,
      isOutdated: lastLockedVersion !== null && latestLook.sourceOutfitVersion < lastLockedVersion,
    };
  },
};
