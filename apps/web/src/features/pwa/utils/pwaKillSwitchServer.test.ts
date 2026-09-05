import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const importIsPwaKillSwitchEngagedOnServer = async () => {
  vi.resetModules();
  const { isPwaKillSwitchEngagedOnServer } = await import("./pwaKillSwitchServer");
  return isPwaKillSwitchEngagedOnServer;
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isPwaKillSwitchEngagedOnServer", () => {
  it("is engaged once ops sets the kill-switch environment variable", async () => {
    vi.stubEnv("PWA_KILL_SWITCH", "true");

    const isPwaKillSwitchEngagedOnServer = await importIsPwaKillSwitchEngagedOnServer();

    expect(isPwaKillSwitchEngagedOnServer()).toBe(true);
  });

  it("is not engaged when the variable is unset", async () => {
    vi.stubEnv("PWA_KILL_SWITCH", undefined);

    const isPwaKillSwitchEngagedOnServer = await importIsPwaKillSwitchEngagedOnServer();

    expect(isPwaKillSwitchEngagedOnServer()).toBe(false);
  });

  it("is not engaged for any value other than the exact expected one", async () => {
    vi.stubEnv("PWA_KILL_SWITCH", "1");

    const isPwaKillSwitchEngagedOnServer = await importIsPwaKillSwitchEngagedOnServer();

    expect(isPwaKillSwitchEngagedOnServer()).toBe(false);
  });
});
