import { beforeEach, describe, expect, it, vi } from "vitest";

import { VISIT_COUNT_STORAGE_KEY } from "../constants/installPrompt";
import {
  canOfferBrowserInstall,
  showBrowserInstallPrompt,
  subscribeToInstallPrompt,
} from "./installPromptStore";

type FakeBeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const dispatchBeforeInstallPrompt = (
  overrides: Partial<Pick<FakeBeforeInstallPromptEvent, "prompt" | "userChoice">> = {},
): FakeBeforeInstallPromptEvent => {
  const event = new Event("beforeinstallprompt", {
    cancelable: true,
  }) as FakeBeforeInstallPromptEvent;
  event.prompt = overrides.prompt ?? vi.fn(async () => undefined);
  event.userChoice = overrides.userChoice ?? Promise.resolve({ outcome: "accepted" });
  window.dispatchEvent(event);
  return event;
};

beforeEach(() => {
  window.dispatchEvent(new Event("appinstalled"));
});

describe("installPromptStore", () => {
  it("offers nothing until the browser fires beforeinstallprompt", () => {
    expect(canOfferBrowserInstall()).toBe(false);
  });

  it("captures the browser's install prompt and prevents its default banner", () => {
    const event = dispatchBeforeInstallPrompt();

    expect(canOfferBrowserInstall()).toBe(true);
    expect(event.defaultPrevented).toBe(true);
  });

  it("notifies subscribers when a prompt becomes available", () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeToInstallPrompt(onChange);

    dispatchBeforeInstallPrompt();

    expect(onChange).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("stops notifying once unsubscribed", () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeToInstallPrompt(onChange);
    unsubscribe();

    dispatchBeforeInstallPrompt();

    expect(onChange).not.toHaveBeenCalled();
  });

  it("shows the captured prompt, reports the outcome, and then forgets it", async () => {
    const prompt = vi.fn(async () => undefined);
    dispatchBeforeInstallPrompt({ prompt, userChoice: Promise.resolve({ outcome: "accepted" }) });

    const outcome = await showBrowserInstallPrompt();

    expect(prompt).toHaveBeenCalledTimes(1);
    expect(outcome).toBe("accepted");
    expect(canOfferBrowserInstall()).toBe(false);
  });

  it("reports a dismissed outcome without throwing", async () => {
    dispatchBeforeInstallPrompt({ userChoice: Promise.resolve({ outcome: "dismissed" }) });

    await expect(showBrowserInstallPrompt()).resolves.toBe("dismissed");
  });

  it("resolves null when there is nothing captured to show", async () => {
    await expect(showBrowserInstallPrompt()).resolves.toBeNull();
  });

  it("forgets the captured prompt once the app reports it was installed", () => {
    dispatchBeforeInstallPrompt();
    expect(canOfferBrowserInstall()).toBe(true);

    window.dispatchEvent(new Event("appinstalled"));

    expect(canOfferBrowserInstall()).toBe(false);
  });

  it("records a visit as soon as the module loads", () => {
    expect(window.localStorage.getItem(VISIT_COUNT_STORAGE_KEY)).toBe("1");
  });
});
