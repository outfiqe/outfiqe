"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

import { isPwaEnabled } from "../constants/pwaFeatureFlag";
import { subscribeToPush, unsubscribeFromPush } from "../utils/pushClient";
import { isIosBrowser, isRunningStandalone, supportsWebPush } from "../utils/standalone";

export type PushOptInState =
  "unavailable" | "needs-install" | "can-enable" | "enabling" | "enabled" | "blocked" | "failed";

type PushBaseState = Exclude<PushOptInState, "enabling" | "failed">;

const readBaseState = (): PushBaseState => {
  if (!isPwaEnabled || !supportsWebPush()) return "unavailable";
  if (isIosBrowser() && !isRunningStandalone()) return "needs-install";
  if (Notification.permission === "denied") return "blocked";
  if (Notification.permission === "granted") return "enabled";
  return "can-enable";
};

const NO_OP_UNSUBSCRIBE = () => () => {};

const subscribeToPermissionChanges = (onChange: () => void): (() => void) => {
  if (typeof navigator === "undefined" || !navigator.permissions?.query) return NO_OP_UNSUBSCRIBE();

  let permissionStatus: PermissionStatus | undefined;
  void navigator.permissions
    .query({ name: "notifications" as PermissionName })
    .then((status) => {
      permissionStatus = status;
      status.addEventListener("change", onChange);
    })
    .catch(() => undefined);

  return () => permissionStatus?.removeEventListener("change", onChange);
};

const assumeUnavailableDuringSsr = (): PushBaseState => "unavailable";

export const usePushSubscription = () => {
  const baseState = useSyncExternalStore(
    subscribeToPermissionChanges,
    readBaseState,
    assumeUnavailableDuringSsr,
  );
  const [transientState, setTransientState] = useState<"enabling" | "failed" | null>(null);

  const state: PushOptInState = transientState ?? baseState;

  const enable = useCallback(async () => {
    setTransientState("enabling");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setTransientState(null);
        return;
      }
      await subscribeToPush();
      setTransientState(null);
    } catch {
      setTransientState("failed");
    }
  }, []);

  const disable = useCallback(async () => {
    setTransientState(null);
    await unsubscribeFromPush().catch(() => undefined);
  }, []);

  return { state, enable, disable };
};
