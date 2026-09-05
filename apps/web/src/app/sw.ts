import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import { CacheFirst, ExpirationPlugin, NetworkFirst, NetworkOnly, Serwist } from "serwist";

import {
  BACKGROUND_REFRESH_PATH,
  BACKGROUND_REFRESH_SYNC_TAG,
} from "../features/pwa/constants/backgroundRefresh";
import { isPrivatePath } from "../features/pwa/constants/privatePaths";
import { parsePushMessage } from "../features/pwa/constants/pushMessage";
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
import {
  SERVICE_WORKER_ERROR_MESSAGE,
  type ServiceWorkerErrorReport,
} from "../features/pwa/constants/serviceWorkerError";
import { CLEAR_CACHED_CONTENT_MESSAGE } from "../features/pwa/constants/serviceWorkerMessages";
import {
  SHARE_TARGET_PATH,
  SHARE_TARGET_PHOTO_FIELD_NAME,
  SHARED_PHOTO_CACHE_NAME,
  SHARED_PHOTO_CACHE_URL,
} from "../features/pwa/constants/shareTarget";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

interface PeriodicSyncEvent extends ExtendableEvent {
  readonly tag: string;
}

declare global {
  interface ServiceWorkerGlobalScopeEventMap {
    periodicsync: PeriodicSyncEvent;
  }
}

declare const self: ServiceWorkerGlobalScope;

declare const __OUTFIQE_IMAGE_HOSTS__: string[];

type BadgeCapableWorkerNavigator = WorkerNavigator & { setAppBadge?: () => Promise<void> };

const markAppIconWithUnseenPush = (): void => {
  const badgeNavigator = self.navigator as BadgeCapableWorkerNavigator;
  if (!badgeNavigator.setAppBadge) return;
  badgeNavigator.setAppBadge().catch(() => undefined);
};

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
        purgeOnQuotaError: true,
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

const APP_ICON_PATH = "/icons/icon-192-any.png";

type RenotifyingNotificationOptions = NotificationOptions & { renotify?: boolean };

const showIncomingPush = async (rawBody: string | undefined): Promise<void> => {
  const message = parsePushMessage(rawBody);

  const options: RenotifyingNotificationOptions = {
    body: message.body,
    tag: message.tag,
    renotify: true,
    icon: APP_ICON_PATH,
    badge: APP_ICON_PATH,
    data: { url: message.url },
  };

  await self.registration.showNotification(message.title, options);

  markAppIconWithUnseenPush();
};

self.addEventListener("push", (event) => {
  event.waitUntil(showIncomingPush(event.data?.text()));
});

const openFromNotification = async (targetUrl: string): Promise<void> => {
  const openClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  const sameOriginClient = openClients.find((client) =>
    client.url.startsWith(self.location.origin),
  );

  if (sameOriginClient) {
    await sameOriginClient.focus();
    await sameOriginClient.navigate(targetUrl).catch(() => undefined);
    return;
  }

  await self.clients.openWindow(targetUrl);
};

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data as { url?: string } | null)?.url ?? "/notifications";
  event.waitUntil(openFromNotification(targetUrl));
});

const isShareTargetSubmission = (request: Request): boolean =>
  request.method === "POST" && new URL(request.url).pathname === SHARE_TARGET_PATH;

const storeSharedPhoto = async (formData: FormData): Promise<void> => {
  const photo = formData.get(SHARE_TARGET_PHOTO_FIELD_NAME);
  if (!(photo instanceof File)) return;

  const cache = await caches.open(SHARED_PHOTO_CACHE_NAME);
  await cache.put(
    SHARED_PHOTO_CACHE_URL,
    new Response(photo, { headers: { "Content-Type": photo.type } }),
  );
};

const goToComposeAnywayWithoutAPhoto = () => undefined;

const handleShareTargetSubmission = async (request: Request): Promise<Response> => {
  await request.formData().then(storeSharedPhoto).catch(goToComposeAnywayWithoutAPhoto);

  return Response.redirect(SHARE_TARGET_PATH, 303);
};

self.addEventListener("fetch", (event) => {
  if (!isShareTargetSubmission(event.request)) return;
  event.respondWith(handleShareTargetSubmission(event.request));
});

const keepServingWhateverIsAlreadyCached = () => undefined;

const refreshFeedPageInBackground = async (): Promise<void> => {
  const response = await fetch(BACKGROUND_REFRESH_PATH, { credentials: "same-origin" });
  if (!response.ok || response.redirected) return;

  const cache = await caches.open(VISITED_PAGES_CACHE_NAME);
  await cache.put(BACKGROUND_REFRESH_PATH, response).catch(keepServingWhateverIsAlreadyCached);
};

self.addEventListener("periodicsync", (event) => {
  if (event.tag !== BACKGROUND_REFRESH_SYNC_TAG) return;
  event.waitUntil(refreshFeedPageInBackground());
});

const reportServiceWorkerError = async (context: string, cause: unknown): Promise<void> => {
  const message = cause instanceof Error ? cause.message : String(cause);
  const stack = cause instanceof Error ? cause.stack : undefined;
  const report: ServiceWorkerErrorReport = {
    type: SERVICE_WORKER_ERROR_MESSAGE,
    context,
    message,
    stack,
  };

  const openClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  openClients.forEach((client) => client.postMessage(report));
};

self.addEventListener("error", (event) => {
  void reportServiceWorkerError("error", event.error ?? event.message);
});

self.addEventListener("unhandledrejection", (event) => {
  void reportServiceWorkerError("unhandledrejection", event.reason);
});

serwist.addEventListeners();
