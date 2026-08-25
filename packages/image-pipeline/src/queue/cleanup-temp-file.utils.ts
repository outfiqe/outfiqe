import type { StorageAdapter } from "../storage/storage-adapter.types.js";
import type { ImageAssetRepository } from "./image-asset-repository.types.js";
import { isImageAssetFullyComplete } from "./image-asset-repository.types.js";

export const maybeCleanupTempFile = async (
  assetId: string,
  assetRepository: ImageAssetRepository,
  tempStorageAdapter: StorageAdapter,
): Promise<void> => {
  const asset = await assetRepository.findById(assetId);
  const { tempFileCleanedUp, tempStorageKey } = asset;
  if (tempFileCleanedUp || !isImageAssetFullyComplete(asset)) {
    return;
  }
  await tempStorageAdapter.delete(tempStorageKey);
  await assetRepository.markTempFileCleanedUp(assetId);
};
