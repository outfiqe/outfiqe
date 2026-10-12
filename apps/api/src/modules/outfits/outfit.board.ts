import { platformSettingsService } from "#modules/platform-settings/platform-settings.service.js";
import type { DbClient } from "#types/db.types.js";

import { outfitErrors } from "./outfit.errors.js";
import { outfitRepository } from "./outfit.repository.js";
import type { OutfitBoardLimitsView, OutfitBoardView, OutfitViewerRole } from "./outfit.types.js";
import { toBoardView } from "./outfit.utils.js";
import { outfitPhotoRepository } from "./photos/photo.repository.js";
import { toOutfitPhotoView } from "./photos/photo.utils.js";

export const loadBoardLimits = async (): Promise<OutfitBoardLimitsView> => {
  const [
    maxItemsPerBoard,
    minItemsToLock,
    maxEditorsPerBoard,
    maxPhotosPerMember,
    maxPhotosPerBoard,
    maxCoverPhotos,
  ] = await Promise.all([
    platformSettingsService.get("outfit.maxItemsPerBoard"),
    platformSettingsService.get("outfit.minItemsToLock"),
    platformSettingsService.get("outfit.maxEditorsPerBoard"),
    platformSettingsService.get("outfit.maxPhotosPerMember"),
    platformSettingsService.get("outfit.maxPhotosPerBoard"),
    platformSettingsService.get("outfit.maxCoverPhotos"),
  ]);
  return {
    maxItemsPerBoard,
    minItemsToLock,
    maxEditorsPerBoard,
    maxPhotosPerMember,
    maxPhotosPerBoard,
    maxCoverPhotos,
  };
};

export const loadBoardView = async (
  client: DbClient,
  outfitId: string,
  myRole: OutfitViewerRole,
): Promise<OutfitBoardView> => {
  const [board, limits, photoRows] = await Promise.all([
    outfitRepository.loadBoard(client, outfitId),
    loadBoardLimits(),
    outfitPhotoRepository.listForBoard(client, outfitId),
  ]);
  if (!board) throw outfitErrors.notFound();
  return { ...toBoardView(board, { myRole, limits }), photos: photoRows.map(toOutfitPhotoView) };
};
