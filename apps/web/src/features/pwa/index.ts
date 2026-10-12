export type { AppIconDescriptor, AppIconPurpose } from "./app-manifest/constants/appIcons";
export {
  appIconFileName,
  appIconPath,
  APPLE_TOUCH_ICON_PATH,
  APPLE_TOUCH_ICON_SIZE,
  installAppIcons,
  MASKABLE_SAFE_ZONE_RATIO,
  SCALABLE_ICON_PATH,
} from "./app-manifest/constants/appIcons";
export {
  appleWebAppMetadata,
  pwaIcons,
  WEB_MANIFEST_PATH,
} from "./app-manifest/constants/appMetadata";
export type {
  AppScreenshot,
  AppScreenshotFormFactor,
} from "./app-manifest/constants/appScreenshots";
export { appScreenshotPath, appScreenshots } from "./app-manifest/constants/appScreenshots";
export { appShortcuts } from "./app-manifest/constants/appShortcuts";
export { DARK_THEME_COLOR, LIGHT_THEME_COLOR } from "./app-manifest/constants/appTheme";
export {
  SHARE_TARGET_PATH,
  SHARE_TARGET_PHOTO_FIELD_NAME,
  SHARED_PHOTO_CACHE_NAME,
  SHARED_PHOTO_CACHE_URL,
} from "./app-manifest/constants/shareTarget";
export { useSharedPhoto } from "./app-manifest/hooks/useSharedPhoto";
export { pwaViewport } from "./app-manifest/utils/appViewport";
export { toManifestIcons } from "./app-manifest/utils/manifestIcons";
export type { ShareOutcome, SharePayload } from "./app-manifest/utils/webShare";
export { shareOrCopyLink } from "./app-manifest/utils/webShare";
export { isPrivatePath, PRIVATE_PATH_PREFIXES } from "./constants/privatePaths";
export { isPwaEnabled } from "./constants/pwaFeatureFlag";
export { AppleSplashLinks } from "./install/components/AppleSplashLinks";
export { InstallPrompt } from "./install/components/InstallPrompt";
export type { AppleSplashScreen } from "./install/constants/appleSplashScreens";
export {
  appleSplashFileName,
  appleSplashPath,
  appleSplashScreens,
} from "./install/constants/appleSplashScreens";
export {
  hasVisitedOftenEnough,
  isWithinInstallPromptCooldown,
  recordAppVisit,
  rememberInstallPromptDismissed,
  VISITS_BEFORE_SUGGESTING_INSTALL,
} from "./install/constants/installPrompt";
export type { InstallPromptState } from "./install/hooks/useInstallPrompt";
export { useInstallPrompt } from "./install/hooks/useInstallPrompt";
export { toAppleSplashMediaQuery } from "./install/utils/appleSplashMedia";
export {
  canOfferBrowserInstall,
  showBrowserInstallPrompt,
  subscribeToInstallPrompt,
} from "./install/utils/installPromptStore";
export { BackgroundRefreshRegistration } from "./offline/components/BackgroundRefreshRegistration";
export { ClearOfflineDataCard } from "./offline/components/ClearOfflineDataCard";
export { OfflineActionSync } from "./offline/components/OfflineActionSync";
export { OfflineBanner } from "./offline/components/OfflineBanner";
export { OfflineRetryButton } from "./offline/components/OfflineRetryButton";
export { PersistentStorageRequest } from "./offline/components/PersistentStorageRequest";
export {
  BACKGROUND_REFRESH_MIN_INTERVAL_MS,
  BACKGROUND_REFRESH_PATH,
  BACKGROUND_REFRESH_SYNC_TAG,
} from "./offline/constants/backgroundRefresh";
export {
  MAX_QUEUED_OFFLINE_ACTIONS,
  OFFLINE_ACTION_QUEUE_STORAGE_KEY,
} from "./offline/constants/offlineActions";
export {
  isPersistableQueryKey,
  PERSISTABLE_QUERY_ROOTS,
  PERSISTED_CACHE_MAX_AGE_MS,
  PERSISTED_CACHE_VERSION,
} from "./offline/constants/offlineCache";
export { useIsOnline } from "./offline/hooks/useIsOnline";
export { registerBackgroundRefresh } from "./offline/utils/backgroundRefresh";
export { clearCachedContent } from "./offline/utils/clearCachedContent";
export { clearAllOfflineData } from "./offline/utils/clearOfflineData";
export {
  drainQueuedOfflineActions,
  type OfflineActionHandler,
  registerOfflineActionHandler,
} from "./offline/utils/offlineActionProcessor";
export {
  enqueueOfflineAction,
  listQueuedOfflineActions,
  type QueuedOfflineAction,
  removeQueuedOfflineAction,
} from "./offline/utils/offlineActionQueue";
export {
  clearPersistedQueries,
  createQueryPersister,
  shouldPersistQuery,
} from "./offline/utils/queryPersister";
export { requestPersistentStorage } from "./offline/utils/requestPersistentStorage";
export { AppBadgeSync } from "./push/components/AppBadgeSync";
export { PushNotificationPrompt } from "./push/components/PushNotificationPrompt";
export type { PushOptInState } from "./push/hooks/usePushSubscription";
export { usePushSubscription } from "./push/hooks/usePushSubscription";
export { showUnreadBadge } from "./push/utils/appBadge";
export { subscribeToPush, unsubscribeFromPush } from "./push/utils/pushClient";
export { AppUpdatePrompt } from "./service-worker/components/AppUpdatePrompt";
export { PwaKillSwitchTeardown } from "./service-worker/components/PwaKillSwitchTeardown";
export { ServiceWorkerErrorReporter } from "./service-worker/components/ServiceWorkerErrorReporter";
export { ServiceWorkerProvider } from "./service-worker/components/ServiceWorkerProvider";
export {
  isPwaKillSwitchEngagedOnClient,
  PWA_KILL_SWITCH_ATTRIBUTE,
} from "./service-worker/constants/pwaKillSwitch";
export {
  IMAGE_CACHE_NAME,
  IMAGE_HOSTS_GLOBAL_NAME,
  IMAGE_PATH_PREFIX,
} from "./service-worker/constants/runtimeCaching";
export {
  OFFLINE_PATH,
  SERVICE_WORKER_SCOPE,
  SERVICE_WORKER_SCRIPT_TYPE,
  SERVICE_WORKER_URL,
} from "./service-worker/constants/serviceWorker";
export { teardownServiceWorkerAndCaches } from "./service-worker/utils/teardownServiceWorkerAndCaches";
export { toImageHosts } from "./utils/imageHosts";
export { isIosBrowser, isRunningStandalone, supportsWebPush } from "./utils/standalone";
