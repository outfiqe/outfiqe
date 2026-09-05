import { clearCachedContent } from "./clearCachedContent";
import { clearPersistedQueries } from "./queryPersister";

export const clearAllOfflineData = async (): Promise<void> => {
  await Promise.all([clearCachedContent(), clearPersistedQueries()]);
};
