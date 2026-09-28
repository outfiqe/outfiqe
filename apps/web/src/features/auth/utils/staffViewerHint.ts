import { useSyncExternalStore } from "react";

export const STAFF_VIEWER_HINT_KEY = "outfiqe-last-viewer-was-staff";
const HINT_ON = "1";

const subscribeToNothing = () => () => undefined;

export const rememberViewerIsStaff = (isStaff: boolean) => {
  try {
    if (isStaff) localStorage.setItem(STAFF_VIEWER_HINT_KEY, HINT_ON);
    else localStorage.removeItem(STAFF_VIEWER_HINT_KEY);
  } catch {
    return;
  }
};

const readStaffViewerHint = (): boolean => {
  try {
    return localStorage.getItem(STAFF_VIEWER_HINT_KEY) === HINT_ON;
  } catch {
    return false;
  }
};

export const useStaffViewerHint = (): boolean =>
  useSyncExternalStore(subscribeToNothing, readStaffViewerHint, () => false);
