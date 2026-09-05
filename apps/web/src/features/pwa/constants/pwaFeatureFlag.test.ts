import { afterEach, describe, expect, it, vi } from "vitest";

import { PWA_KILL_SWITCH_ATTRIBUTE } from "./pwaKillSwitch";

const importIsPwaEnabled = async () => {
  vi.resetModules();
  const { isPwaEnabled } = await import("./pwaFeatureFlag");
  return isPwaEnabled;
};

afterEach(() => {
  document.documentElement.removeAttribute(PWA_KILL_SWITCH_ATTRIBUTE);
  vi.unstubAllEnvs();
});

describe("isPwaEnabled", () => {
  it("is enabled when the build flag is on and the kill switch is not engaged", async () => {
    vi.stubEnv("NEXT_PUBLIC_PWA_ENABLED", "true");

    expect(await importIsPwaEnabled()).toBe(true);
  });

  it("stays off when the build flag was never turned on", async () => {
    vi.stubEnv("NEXT_PUBLIC_PWA_ENABLED", undefined);

    expect(await importIsPwaEnabled()).toBe(false);
  });

  it("turns off the moment the kill switch is engaged, even with the build flag on", async () => {
    vi.stubEnv("NEXT_PUBLIC_PWA_ENABLED", "true");
    document.documentElement.setAttribute(PWA_KILL_SWITCH_ATTRIBUTE, "true");

    expect(await importIsPwaEnabled()).toBe(false);
  });
});
