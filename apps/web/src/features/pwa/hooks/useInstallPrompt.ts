"use client";

import { useState, useSyncExternalStore } from "react";

import {
  hasVisitedOftenEnough,
  isWithinInstallPromptCooldown,
  rememberInstallPromptDismissed,
} from "../constants/installPrompt";
import { isPwaEnabled } from "../constants/pwaFeatureFlag";
import {
  canOfferBrowserInstall,
  showBrowserInstallPrompt,
  subscribeToInstallPrompt,
} from "../utils/installPromptStore";
import { isIosBrowser, isRunningStandalone } from "../utils/standalone";

export type InstallPromptState = "hidden" | "can-install" | "ios-instructions";

const assumeNoBrowserPromptDuringSsr = (): boolean => false;

export const useInstallPrompt = () => {
  const hasBrowserPrompt = useSyncExternalStore(
    subscribeToInstallPrompt,
    canOfferBrowserInstall,
    assumeNoBrowserPromptDuringSsr,
  );
  const [isDismissed, setIsDismissed] = useState(() => isWithinInstallPromptCooldown());

  const dismiss = (): void => {
    rememberInstallPromptDismissed();
    setIsDismissed(true);
  };

  const state: InstallPromptState = (() => {
    if (!isPwaEnabled || isDismissed || isRunningStandalone() || !hasVisitedOftenEnough()) {
      return "hidden";
    }
    if (hasBrowserPrompt) return "can-install";
    if (isIosBrowser()) return "ios-instructions";
    return "hidden";
  })();

  const install = async (): Promise<void> => {
    const outcome = await showBrowserInstallPrompt();
    if (outcome) dismiss();
  };

  return { state, dismiss, install };
};
