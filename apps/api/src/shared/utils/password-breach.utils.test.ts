import { createHash } from "node:crypto";

import { afterEach, describe, expect, it, vi } from "vitest";

import { isPasswordBreached } from "#lib/password-breach.utils.js";

vi.mock("#config/env.config.js", () => ({
  env: { PASSWORD_BREACH_CHECK_ENABLED: true },
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("isPasswordBreached", () => {
  it("returns true when the password's hash suffix appears in the range response", async () => {
    const password = "known-breached-password";
    const sha1Hex = createHash("sha1").update(password).digest("hex").toUpperCase();
    const suffix = sha1Hex.slice(5);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(`${suffix}:42\nSOMEOTHERSUFFIX00000000000000000:1`),
      }),
    );

    await expect(isPasswordBreached(password)).resolves.toBe(true);
  });

  it("returns false when the suffix is not present in the range response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve("SOMEOTHERSUFFIX00000000000000000:1"),
      }),
    );

    await expect(isPasswordBreached("a-very-unique-password")).resolves.toBe(false);
  });

  it("fails open (returns false) when the range API responds with a non-2xx status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));

    await expect(isPasswordBreached("any-password")).resolves.toBe(false);
  });

  it("fails open (returns false) when the network call throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network unreachable")));

    await expect(isPasswordBreached("any-password")).resolves.toBe(false);
  });
});
