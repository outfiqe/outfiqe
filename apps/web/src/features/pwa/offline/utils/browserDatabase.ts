export const isBrowserDatabaseAvailable = (): boolean =>
  typeof indexedDB !== "undefined" && indexedDB !== null;

export const runWithoutFailingWhenStorageIsUnavailable = async <T>(
  storageOperation: () => Promise<T>,
): Promise<T | undefined> => {
  if (!isBrowserDatabaseAvailable()) return undefined;

  try {
    return await storageOperation();
  } catch {
    return undefined;
  }
};
