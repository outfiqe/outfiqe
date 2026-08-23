import { afterEach, describe, expect, it, vi } from "vitest";

import { verifyCaptcha } from "./auth.captcha.utils.js";

const envMock = vi.hoisted(() => ({
  env: { CAPTCHA_ENABLED: true, TURNSTILE_SECRET_KEY: "test-secret" },
}));

vi.mock("#config/env.config.js", () => envMock);

afterEach(() => {
  vi.unstubAllGlobals();
  envMock.env.CAPTCHA_ENABLED = true;
});

describe("verifyCaptcha", () => {
  it("returns true without calling fetch when captcha checking is disabled", async () => {
    envMock.env.CAPTCHA_ENABLED = false;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(verifyCaptcha(undefined)).resolves.toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns false when no token is provided", async () => {
    await expect(verifyCaptcha(undefined)).resolves.toBe(false);
  });

  it("returns true when Turnstile confirms the token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ success: true }) }),
    );

    await expect(verifyCaptcha("a-valid-token")).resolves.toBe(true);
  });

  it("returns false when Turnstile rejects the token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ success: false }) }),
    );

    await expect(verifyCaptcha("a-bad-token")).resolves.toBe(false);
  });

  it("fails closed (returns false) when Turnstile responds with a non-2xx status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));

    await expect(verifyCaptcha("a-token")).resolves.toBe(false);
  });

  it("fails closed (returns false) when the network call throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network unreachable")));

    await expect(verifyCaptcha("a-token")).resolves.toBe(false);
  });
});
