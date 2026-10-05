import { subHours } from "date-fns/subHours";

import { prisma } from "#db/prisma.js";
import {
  OutfitEventType,
  OutfitMemberRole,
  OutfitPhotoKind,
  OutfitPhotoStatus,
  OutfitStatus,
} from "#generated/prisma/enums.js";
import logger from "#lib/winston.utils.js";
import { featureFlagsService } from "#modules/feature-flags/feature-flags.service.js";
import { imageProcessingService } from "#modules/image-processing/image-processing.service.js";
import { CONTENT_MODERATE_PERMISSION_KEY } from "#modules/platform-access/platform-access.constants.js";
import { platformAccessService } from "#modules/platform-access/platform-access.service.js";
import { PLATFORM_AUDIT_ACTION } from "#modules/platform-audit/platform-audit.constants.js";
import { platformAudit } from "#modules/platform-audit/platform-audit.service.js";
import { platformSettingsService } from "#modules/platform-settings/platform-settings.service.js";
import { describeError } from "#redis/redis.utils.js";

import { OUTFIT_IDEMPOTENCY_ENDPOINT, OUTFIT_PHOTO_CLEANUP } from "./outfit.constants.js";
import { outfitErrors } from "./outfit.errors.js";
import type { AddOutfitPhotosBody, SetOutfitCoversBody } from "./outfit.schemas.js";
import {
  OUTFIT_WRITE_ACCESS,
  type OutfitWriteCall,
  type OutfitWriteResult,
  runOutfitWrite,
  toWriteRequest,
} from "./outfit.write.js";
import { outfitPhotoRepository } from "./outfit-photo.repository.js";
import type { OutfitCoverPhotoView } from "./outfit-photo.types.js";
import { groupCoversByOutfit } from "./outfit-photo.utils.js";
import type { ModerationPrincipal } from "./outfit-social.types.js";

const NOT_ARCHIVED = [OutfitStatus.DRAFT, OutfitStatus.LOCKED] as const;
const NO_ROWS = 0;
const OUTFIT_PHOTO_AUDIT_TARGET_TYPE = "OutfitPhoto";

const requireTryOnEnabled = async (kind: OutfitPhotoKind, actorId: string): Promise<void> => {
  if (kind !== OutfitPhotoKind.TRY_ON) return;
  const isTryOnEnabled = await featureFlagsService.isEnabledForUser("outfit_try_on", actorId);
  if (!isTryOnEnabled) throw outfitErrors.tryOnUnavailable();
};

export const outfitPhotoService = {
  async addPhotos(
    call: OutfitWriteCall,
    { kind, photos }: AddOutfitPhotosBody,
  ): Promise<OutfitWriteResult> {
    await requireTryOnEnabled(kind, call.actorId);
    const imageAssetIds = photos.map(({ imageAssetId }) => imageAssetId);
    await imageProcessingService.assertAssetsOwnedBy(imageAssetIds, call.actorId);

    return runOutfitWrite({
      ...toWriteRequest(call, OUTFIT_IDEMPOTENCY_ENDPOINT.ADD_PHOTOS, {
        kind,
        photos: photos.map(({ imageUrl, imageAssetId }) => ({ imageUrl, imageAssetId })),
      }),
      access: OUTFIT_WRITE_ACCESS.ANY_MEMBER,
      allowedStatuses: NOT_ARCHIVED,
      apply: async ({ tx, outfit, actor }) => {
        const [maxPhotosPerMember, maxPhotosPerBoard] = await Promise.all([
          platformSettingsService.get("outfit.maxPhotosPerMember"),
          platformSettingsService.get("outfit.maxPhotosPerBoard"),
        ]);
        const [myPhotoCount, boardPhotoCount, alreadyUsedCount] = await Promise.all([
          outfitPhotoRepository.countActiveByUploader(tx, outfit.id, actor.id),
          outfitPhotoRepository.countActiveOnBoard(tx, outfit.id),
          outfitPhotoRepository.countAssetsAlreadyUsed(tx, imageAssetIds),
        ]);
        if (alreadyUsedCount > NO_ROWS) throw outfitErrors.photoAlreadyAdded();
        if (myPhotoCount + photos.length > maxPhotosPerMember) {
          throw outfitErrors.memberPhotoLimitReached(maxPhotosPerMember);
        }
        if (boardPhotoCount + photos.length > maxPhotosPerBoard) {
          throw outfitErrors.boardPhotoLimitReached(maxPhotosPerBoard);
        }

        const completedAssetIds = await outfitPhotoRepository.findCompletedAssetIds(
          tx,
          imageAssetIds,
        );
        const photoIds = await outfitPhotoRepository.createMany(
          tx,
          { outfitId: outfit.id, uploaderId: actor.id, kind },
          photos.map(({ imageUrl, imageAssetId }) => ({
            imageUrl,
            imageAssetId,
            status: completedAssetIds.has(imageAssetId)
              ? OutfitPhotoStatus.READY
              : OutfitPhotoStatus.PROCESSING,
          })),
        );
        return { eventType: OutfitEventType.PHOTO_ADDED, payload: { kind, photoIds } };
      },
    });
  },

  removePhoto(call: OutfitWriteCall, photoId: string): Promise<OutfitWriteResult> {
    return runOutfitWrite({
      ...toWriteRequest(call, OUTFIT_IDEMPOTENCY_ENDPOINT.REMOVE_PHOTO, { photoId }),
      access: OUTFIT_WRITE_ACCESS.ANY_MEMBER,
      allowedStatuses: NOT_ARCHIVED,
      apply: async ({ tx, outfit, actor, actorRole }) => {
        const photo = await outfitPhotoRepository.findActive(tx, outfit.id, photoId);
        if (!photo) throw outfitErrors.photoNotFound();
        const canRemove = photo.uploaderId === actor.id || actorRole === OutfitMemberRole.OWNER;
        if (!canRemove) throw outfitErrors.notPhotoUploader();

        await outfitPhotoRepository.markRemoved(tx, photoId, actor.id);
        return { eventType: OutfitEventType.PHOTO_REMOVED, payload: { photoId } };
      },
    });
  },

  setCovers(call: OutfitWriteCall, { photoIds }: SetOutfitCoversBody): Promise<OutfitWriteResult> {
    return runOutfitWrite({
      ...toWriteRequest(call, OUTFIT_IDEMPOTENCY_ENDPOINT.SET_COVERS, { photoIds }),
      access: OUTFIT_WRITE_ACCESS.OWNER_ONLY,
      allowedStatuses: NOT_ARCHIVED,
      apply: async ({ tx, outfit }) => {
        const maxCoverPhotos = await platformSettingsService.get("outfit.maxCoverPhotos");
        if (photoIds.length > maxCoverPhotos) throw outfitErrors.tooManyCovers(maxCoverPhotos);
        const eligibleCount = await outfitPhotoRepository.countCoverEligible(
          tx,
          outfit.id,
          photoIds,
        );
        if (eligibleCount !== photoIds.length) throw outfitErrors.coverNotEligible();

        await outfitPhotoRepository.replaceCovers(tx, outfit.id, photoIds);
        return { eventType: OutfitEventType.COVERS_CHANGED, payload: { photoIds } };
      },
    });
  },

  async removeReportedPhoto(principal: ModerationPrincipal, photoId: string): Promise<void> {
    const canModerate = await platformAccessService.principalHasPermission(
      principal,
      CONTENT_MODERATE_PERMISSION_KEY,
    );
    if (!canModerate) throw outfitErrors.photoNotFound();
    const isRemoved = await outfitPhotoRepository.markRemoved(prisma, photoId, principal.userId);
    if (!isRemoved) throw outfitErrors.photoNotFound();
    await platformAudit.record({
      actorUserId: principal.userId,
      action: PLATFORM_AUDIT_ACTION.OUTFIT_PHOTO_REMOVED_BY_ADMIN,
      summary: "Removed a build photo",
      targetType: OUTFIT_PHOTO_AUDIT_TARGET_TYPE,
      targetId: photoId,
    });
  },
};

export const loadCoversForBuilds = async (
  viewerId: string | null,
  outfitIds: string[],
): Promise<Map<string, OutfitCoverPhotoView[]>> => {
  const isPhotosOn = await featureFlagsService.isEnabledForUser("outfit_photos", viewerId);
  if (!isPhotosOn) return new Map();
  return groupCoversByOutfit(await outfitPhotoRepository.listCoversForBuilds(outfitIds));
};

export const runOutfitPhotoCleanupSweep = async (): Promise<void> => {
  if (!(await featureFlagsService.isRolledOutToAnyone("outfit_builder"))) return;
  try {
    const readyCount = await outfitPhotoRepository.markProcessedPhotosReady();
    const removedCount = await outfitPhotoRepository.removeUnconfirmedPhotos(
      subHours(new Date(), OUTFIT_PHOTO_CLEANUP.UNCONFIRMED_MAX_AGE_HOURS),
      OUTFIT_PHOTO_CLEANUP.SWEEP_BATCH_SIZE,
    );
    if (readyCount > NO_ROWS || removedCount > NO_ROWS) {
      logger.info(`Build photos: ${readyCount} finished processing, ${removedCount} cleaned up`);
    }
  } catch (error) {
    logger.error(`Build photo cleanup failed: ${describeError(error)}`);
    throw error;
  }
};
