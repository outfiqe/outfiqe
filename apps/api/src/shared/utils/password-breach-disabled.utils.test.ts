import { describe, expect, it, vi } from "vitest";

vi.mock("#config/env.config.js", () => ({
  env: { PASSWORD_BREACH_CHECK_ENABLED: false },
}));

const { isPasswordBreached } = await import("#lib/password-breach.utils.js");

describe("isPasswordBreached when the breach check is disabled", () => {
  it("short-circuits to false without calling the range API", async () => {
    await expect(isPasswordBreached("anything")).resolves.toBe(false);
  });
});
