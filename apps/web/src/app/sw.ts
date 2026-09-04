import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import { CacheFirst, ExpirationPlugin, NetworkFirst, NetworkOnly, Serwist } from "serwist";

import { isPrivatePath } from "../features/pwa/constants/privatePaths";
import {
  API_PATH_PREFIX,
  CACHED_IMAGE_LIFETIME_SECONDS,
  CACHED_PAGE_LIFETIME_SECONDS,
  IMAGE_CACHE_NAME,
  IMAGE_PATH_PREFIX,
  IOS_MAX_CACHED_IMAGES,
  IOS_MAX_CACHED_PAGES,
  MAX_CACHED_IMAGES,
  MAX_CACHED_PAGES,
} from "../features/pwa/constants/runtimeCaching";
import { OFFLINE_PATH, VISITED_PAGES_CACHE_NAME } from "../features/pwa/constants/serviceWorker";
import { CLEAR_CACHED_CONTENT_MESSAGE } from "../features/pwa/constants/serviceWorkerMessages";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

declare const __OUTFIQE_IMAGE_HOSTS__: string[];

const imageHosts = typeof __OUTFIQE_IMAGE_HOSTS__ === "undefined" ? [] : __OUTFIQE_IMAGE_HOSTS__;

const isAppleMobileBrowser = /iPad|iPhone|iPod/i.test(self.navigator.userAgent);

const maxCachedImages = isAppleMobileBrowser ? IOS_MAX_CACHED_IMAGES : MAX_CACHED_IMAGES;

const maxCachedPages = isAppleMobileBrowser ? IOS_MAX_CACHED_PAGES : MAX_CACHED_PAGES;

const serveOfflinePageWhenNavigationFails = {
  handlerDidError: () => caches.match(OFFLINE_PATH, { ignoreSearch: true }),
};

const isNavigation = ({ request }: { request: Request }) => request.mode === "navigate";

const publicPageCaching: RuntimeCaching = {
  matcher: ({ request, url, sameOrigin }) =>
    sameOrigin && isNavigation({ request }) && !isPrivatePath(url.pathname),
  handler: new NetworkFirst({
    cacheName: VISITED_PAGES_CACHE_NAME,
    plugins: [
      new ExpirationPlugin({
        maxEntries: maxCachedPages,
        maxAgeSeconds: CACHED_PAGE_LIFETIME_SECONDS,
        maxAgeFrom: "last-used",
      }),
      serveOfflinePageWhenNavigationFails,
    ],
  }),
};

const privatePageNeverStored: RuntimeCaching = {
  matcher: ({ request, url, sameOrigin }) =>
    sameOrigin && isNavigation({ request }) && isPrivatePath(url.pathname),
  handler: new NetworkOnly({ plugins: [serveOfflinePageWhenNavigationFails] }),
};

const apiResponsesNeverStored: RuntimeCaching = {
  matcher: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith(API_PATH_PREFIX),
  handler: new NetworkOnly(),
};

const uploadedImageCaching: RuntimeCaching = {
  matcher: ({ url }) =>
    url.pathname.startsWith(IMAGE_PATH_PREFIX) && imageHosts.includes(url.hostname),
  handler: new CacheFirst({
    cacheName: IMAGE_CACHE_NAME,
    plugins: [
      new ExpirationPlugin({
        maxEntries: maxCachedImages,
        maxAgeSeconds: CACHED_IMAGE_LIFETIME_SECONDS,
        maxAgeFrom: "last-used",
        purgeOnQuotaError: true,
      }),
    ],
  }),
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching: [
    apiResponsesNeverStored,
    privatePageNeverStored,
    publicPageCaching,
    uploadedImageCaching,
    ...defaultCache,
  ],
});

const forgetCachedContent = async () => {
  await Promise.all([caches.delete(VISITED_PAGES_CACHE_NAME), caches.delete(IMAGE_CACHE_NAME)]);
};

self.addEventListener("message", (event) => {
  if (event.data?.type !== CLEAR_CACHED_CONTENT_MESSAGE) return;
  event.waitUntil(forgetCachedContent());
});

serwist.addEventListeners();
