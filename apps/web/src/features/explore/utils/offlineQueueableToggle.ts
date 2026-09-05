import { onlineManager } from "@tanstack/react-query";

import { enqueueOfflineAction } from "@/features/pwa";

export const toggleWithOfflineQueue = async <TResult>(
  actionType: string,
  key: string,
  payload: Record<string, unknown>,
  performToggle: () => Promise<TResult>,
): Promise<TResult | null> => {
  if (!onlineManager.isOnline()) {
    await enqueueOfflineAction(actionType, key, payload);
    return null;
  }

  return performToggle();
};
