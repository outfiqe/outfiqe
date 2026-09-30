import { platformSettingsService } from "#modules/platform-settings/platform-settings.service.js";
import type { DbClient } from "#types/db.types.js";

import { outfitErrors } from "./outfit.errors.js";
import { outfitRepository } from "./outfit.repository.js";
import type { OutfitBoardLimitsView, OutfitBoardView, OutfitViewerRole } from "./outfit.types.js";
import { toBoardView } from "./outfit.utils.js";

export const loadBoardLimits = async (): Promise<OutfitBoardLimitsView> => {
  const [maxItemsPerBoard, minItemsToLock, maxEditorsPerBoard] = await Promise.all([
    platformSettingsService.get("outfit.maxItemsPerBoard"),
    platformSettingsService.get("outfit.minItemsToLock"),
    platformSettingsService.get("outfit.maxEditorsPerBoard"),
  ]);
  return { maxItemsPerBoard, minItemsToLock, maxEditorsPerBoard };
};

export const loadBoardView = async (
  client: DbClient,
  outfitId: string,
  myRole: OutfitViewerRole,
): Promise<OutfitBoardView> => {
  const [board, limits] = await Promise.all([
    outfitRepository.loadBoard(client, outfitId),
    loadBoardLimits(),
  ]);
  if (!board) throw outfitErrors.notFound();
  return toBoardView(board, { myRole, limits });
};
