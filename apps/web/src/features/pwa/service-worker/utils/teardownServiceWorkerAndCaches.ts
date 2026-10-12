const ignoreUnavailableServiceWorker = () => [];

const ignoreUnavailableCacheStorage = () => [];

const leaveRegistrationInPlace = () => undefined;

const leaveCacheInPlace = () => undefined;

export const teardownServiceWorkerAndCaches = async (): Promise<void> => {
  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker
      .getRegistrations()
      .catch(ignoreUnavailableServiceWorker);
    await Promise.all(
      registrations.map((registration) =>
        registration.unregister().catch(leaveRegistrationInPlace),
      ),
    );
  }

  if (typeof caches === "undefined") return;

  const cacheNames = await caches.keys().catch(ignoreUnavailableCacheStorage);
  await Promise.all(
    cacheNames.map((cacheName) => caches.delete(cacheName).catch(leaveCacheInPlace)),
  );
};
