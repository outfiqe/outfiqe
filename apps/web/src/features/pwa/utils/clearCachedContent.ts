import { CLEAR_CACHED_CONTENT_MESSAGE } from "../constants/serviceWorkerMessages";

const ignoreUnavailableServiceWorker = () => undefined;

export const clearCachedContent = async (): Promise<void> => {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

  const registration = await navigator.serviceWorker
    .getRegistration()
    .catch(ignoreUnavailableServiceWorker);

  registration?.active?.postMessage({ type: CLEAR_CACHED_CONTENT_MESSAGE });
};
