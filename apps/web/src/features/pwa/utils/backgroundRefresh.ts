import {
  BACKGROUND_REFRESH_MIN_INTERVAL_MS,
  BACKGROUND_REFRESH_SYNC_TAG,
} from "../constants/backgroundRefresh";

interface PeriodicSyncManager {
  register(tag: string, options?: { minInterval: number }): Promise<void>;
}

declare global {
  interface ServiceWorkerRegistration {
    readonly periodicSync?: PeriodicSyncManager;
  }
}

export const registerBackgroundRefresh = async (): Promise<boolean> => {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return false;
  if (!navigator.permissions?.query) return false;

  try {
    const status = await navigator.permissions.query({
      name: "periodic-background-sync" as PermissionName,
    });
    if (status.state !== "granted") return false;

    const registration = await navigator.serviceWorker.ready;
    if (!registration.periodicSync) return false;

    await registration.periodicSync.register(BACKGROUND_REFRESH_SYNC_TAG, {
      minInterval: BACKGROUND_REFRESH_MIN_INTERVAL_MS,
    });
    return true;
  } catch {
    return false;
  }
};
