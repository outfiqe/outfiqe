const STANDALONE_MEDIA_QUERY = "(display-mode: standalone)";

export const isRunningStandalone = (): boolean => {
  if (typeof window === "undefined") return false;

  const iosStandalone = (window.navigator as { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia(STANDALONE_MEDIA_QUERY).matches;
};

export const isIosBrowser = (): boolean => {
  if (typeof navigator === "undefined") return false;

  const isIpadOnDesktopUserAgent =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || isIpadOnDesktopUserAgent;
};

export const supportsWebPush = (): boolean =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;
