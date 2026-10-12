const ignoreRefusedStorage = () => false;

export const requestPersistentStorage = async (): Promise<boolean> => {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) return false;

  const isAlreadyPersistent = await navigator.storage.persisted?.().catch(ignoreRefusedStorage);
  if (isAlreadyPersistent) return true;

  return navigator.storage.persist().catch(ignoreRefusedStorage);
};
