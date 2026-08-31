import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_APP_ENV = process.env.APP_ENV;

const loadAppEnv = async (value: string | undefined) => {
  vi.resetModules();
  if (value === undefined) {
    delete process.env.APP_ENV;
  } else {
    process.env.APP_ENV = value;
  }
  return import("./app-env.js");
};

afterEach(() => {
  if (ORIGINAL_APP_ENV === undefined) {
    delete process.env.APP_ENV;
  } else {
    process.env.APP_ENV = ORIGINAL_APP_ENV;
  }
  vi.resetModules();
});

describe("app-env", () => {
  it("defaults to local when APP_ENV is unset", async () => {
    const appEnv = await loadAppEnv(undefined);

    expect(appEnv.APP_ENV).toBe("local");
    expect(appEnv.IS_LOCAL).toBe(true);
    expect(appEnv.IS_DEPLOYED).toBe(false);
    expect(appEnv.IS_DEV).toBe(false);
    expect(appEnv.IS_PROD).toBe(false);
  });

  it("falls back to local for an unrecognised value", async () => {
    const appEnv = await loadAppEnv("staging");

    expect(appEnv.APP_ENV).toBe("local");
    expect(appEnv.IS_LOCAL).toBe(true);
  });

  it("recognises the dev environment", async () => {
    const appEnv = await loadAppEnv("dev");

    expect(appEnv.APP_ENV).toBe("dev");
    expect(appEnv.IS_DEV).toBe(true);
    expect(appEnv.IS_DEPLOYED).toBe(true);
    expect(appEnv.IS_LOCAL).toBe(false);
    expect(appEnv.IS_PROD).toBe(false);
  });

  it("recognises the prod environment", async () => {
    const appEnv = await loadAppEnv("prod");

    expect(appEnv.APP_ENV).toBe("prod");
    expect(appEnv.IS_PROD).toBe(true);
    expect(appEnv.IS_DEPLOYED).toBe(true);
    expect(appEnv.IS_LOCAL).toBe(false);
    expect(appEnv.IS_DEV).toBe(false);
  });
});
