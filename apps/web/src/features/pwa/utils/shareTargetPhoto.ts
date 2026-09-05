import { SHARED_PHOTO_CACHE_NAME, SHARED_PHOTO_CACHE_URL } from "../constants/shareTarget";

const SHARED_PHOTO_FILE_NAME = "shared-photo";

export const readSharedPhoto = async (): Promise<File | null> => {
  if (typeof caches === "undefined") return null;

  const cache = await caches.open(SHARED_PHOTO_CACHE_NAME);
  const response = await cache.match(SHARED_PHOTO_CACHE_URL);
  if (!response) return null;

  await cache.delete(SHARED_PHOTO_CACHE_URL);
  const blob = await response.blob();
  return new File([blob], SHARED_PHOTO_FILE_NAME, { type: blob.type });
};
