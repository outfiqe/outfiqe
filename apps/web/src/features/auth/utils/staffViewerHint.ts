import { useSyncExternalStore } from "react";

export const ADMIN_VIEWER_HINT_KEY = "outfiqe-last-viewer-was-admin";
const HINT_ON = "1";

const subscribeToNothing = () => () => undefined;

export const rememberViewerIsAdmin = (isAdmin: boolean) => {
  try {
    if (isAdmin) localStorage.setItem(ADMIN_VIEWER_HINT_KEY, HINT_ON);
    else localStorage.removeItem(ADMIN_VIEWER_HINT_KEY);
  } catch {
    return;
  }
};

const readAdminViewerHint = (): boolean => {
  try {
    return localStorage.getItem(ADMIN_VIEWER_HINT_KEY) === HINT_ON;
  } catch {
    return false;
  }
};

export const useAdminViewerHint = (): boolean =>
  useSyncExternalStore(subscribeToNothing, readAdminViewerHint, () => false);
