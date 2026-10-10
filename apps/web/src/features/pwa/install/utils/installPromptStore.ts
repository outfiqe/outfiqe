import { recordAppVisit } from "../constants/installPrompt";

export type InstallChoice = "accepted" | "dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: InstallChoice }>;
};

let browserInstallPrompt: BeforeInstallPromptEvent | null = null;

const listeners = new Set<() => void>();

const notifyListeners = () => listeners.forEach((listener) => listener());

const captureBrowserInstallPrompt = (event: Event): void => {
  event.preventDefault();
  browserInstallPrompt = event as BeforeInstallPromptEvent;
  notifyListeners();
};

const forgetBrowserInstallPrompt = (): void => {
  browserInstallPrompt = null;
  notifyListeners();
};

if (typeof window !== "undefined") {
  recordAppVisit();
  window.addEventListener("beforeinstallprompt", captureBrowserInstallPrompt);
  window.addEventListener("appinstalled", forgetBrowserInstallPrompt);
}

export const subscribeToInstallPrompt = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const canOfferBrowserInstall = (): boolean => browserInstallPrompt !== null;

export const showBrowserInstallPrompt = async (): Promise<InstallChoice | null> => {
  if (!browserInstallPrompt) return null;

  await browserInstallPrompt.prompt();
  const { outcome } = await browserInstallPrompt.userChoice;
  forgetBrowserInstallPrompt();
  return outcome;
};
