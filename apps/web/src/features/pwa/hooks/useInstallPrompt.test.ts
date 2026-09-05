import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

let pwaEnabled = true;
let iosBrowser = false;
let standalone = false;
let visitedEnough = true;
let withinCooldown = false;
let hasBrowserPrompt = false;

const promptListeners = new Set<() => void>();
const rememberInstallPromptDismissed = vi.fn();
const showBrowserInstallPrompt = vi.fn();

const setHasBrowserPrompt = (value: boolean) => {
  hasBrowserPrompt = value;
  promptListeners.forEach((listener) => listener());
};

vi.mock("../constants/pwaFeatureFlag", () => ({
  get isPwaEnabled() {
    return pwaEnabled;
  },
}));

vi.mock("../constants/installPrompt", () => ({
  hasVisitedOftenEnough: () => visitedEnough,
  isWithinInstallPromptCooldown: () => withinCooldown,
  rememberInstallPromptDismissed,
}));

vi.mock("../utils/installPromptStore", () => ({
  canOfferBrowserInstall: () => hasBrowserPrompt,
  showBrowserInstallPrompt,
  subscribeToInstallPrompt: (listener: () => void) => {
    promptListeners.add(listener);
    return () => promptListeners.delete(listener);
  },
}));

vi.mock("../utils/standalone", () => ({
  isIosBrowser: () => iosBrowser,
  isRunningStandalone: () => standalone,
}));

const { useInstallPrompt } = await import("./useInstallPrompt");

beforeEach(() => {
  pwaEnabled = true;
  iosBrowser = false;
  standalone = false;
  visitedEnough = true;
  withinCooldown = false;
  hasBrowserPrompt = false;
  promptListeners.clear();
  rememberInstallPromptDismissed.mockReset();
  showBrowserInstallPrompt.mockReset();
});

describe("useInstallPrompt", () => {
  it("is hidden when the feature flag is off", async () => {
    pwaEnabled = false;
    const { result } = renderHook(() => useInstallPrompt());

    await waitFor(() => expect(result.current.state).toBe("hidden"));
  });

  it("is hidden until enough visits have been recorded", async () => {
    visitedEnough = false;
    const { result } = renderHook(() => useInstallPrompt());

    await waitFor(() => expect(result.current.state).toBe("hidden"));
  });

  it("is hidden while a recent dismissal is still in cooldown", async () => {
    withinCooldown = true;
    const { result } = renderHook(() => useInstallPrompt());

    await waitFor(() => expect(result.current.state).toBe("hidden"));
  });

  it("is hidden once the app is already installed", async () => {
    standalone = true;
    const { result } = renderHook(() => useInstallPrompt());

    await waitFor(() => expect(result.current.state).toBe("hidden"));
  });

  it("offers a real install once the browser hands over its prompt", async () => {
    const { result } = renderHook(() => useInstallPrompt());
    await waitFor(() => expect(result.current.state).toBe("hidden"));

    act(() => setHasBrowserPrompt(true));

    await waitFor(() => expect(result.current.state).toBe("can-install"));
  });

  it("falls back to home-screen instructions on an iOS browser tab", async () => {
    iosBrowser = true;
    const { result } = renderHook(() => useInstallPrompt());

    await waitFor(() => expect(result.current.state).toBe("ios-instructions"));
  });

  it("remembers a dismissal and hides itself", async () => {
    iosBrowser = true;
    const { result } = renderHook(() => useInstallPrompt());
    await waitFor(() => expect(result.current.state).toBe("ios-instructions"));

    act(() => result.current.dismiss());

    expect(rememberInstallPromptDismissed).toHaveBeenCalledTimes(1);
    expect(result.current.state).toBe("hidden");
  });

  it("remembers a real dismissal after the browser's own prompt resolves", async () => {
    hasBrowserPrompt = true;
    showBrowserInstallPrompt.mockResolvedValue("dismissed");
    const { result } = renderHook(() => useInstallPrompt());
    await waitFor(() => expect(result.current.state).toBe("can-install"));

    await act(async () => {
      await result.current.install();
    });

    expect(showBrowserInstallPrompt).toHaveBeenCalledTimes(1);
    expect(rememberInstallPromptDismissed).toHaveBeenCalledTimes(1);
  });

  it("leaves the prompt untouched when there was nothing to show", async () => {
    hasBrowserPrompt = true;
    showBrowserInstallPrompt.mockResolvedValue(null);
    const { result } = renderHook(() => useInstallPrompt());
    await waitFor(() => expect(result.current.state).toBe("can-install"));

    await act(async () => {
      await result.current.install();
    });

    expect(rememberInstallPromptDismissed).not.toHaveBeenCalled();
  });
});
