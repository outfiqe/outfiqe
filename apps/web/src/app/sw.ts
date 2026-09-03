import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import { NetworkFirst, Serwist } from "serwist";

import { OFFLINE_PATH, VISITED_PAGES_CACHE_NAME } from "../features/pwa/constants/serviceWorker";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serveOfflinePageWhenNavigationFails = {
  handlerDidError: () => caches.match(OFFLINE_PATH, { ignoreSearch: true }),
};

const navigationCaching: RuntimeCaching = {
  matcher: ({ request, sameOrigin }) => sameOrigin && request.mode === "navigate",
  handler: new NetworkFirst({
    cacheName: VISITED_PAGES_CACHE_NAME,
    plugins: [serveOfflinePageWhenNavigationFails],
  }),
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching: [navigationCaching, ...defaultCache],
});

serwist.addEventListeners();
