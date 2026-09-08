import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { THEME_INIT_SCRIPT, THEME_INIT_SCRIPT_SHA256 } from "./theme";

describe("THEME_INIT_SCRIPT_SHA256", () => {
  it("matches the current theme init script so a CSP hash can allow it", () => {
    const digest = createHash("sha256").update(THEME_INIT_SCRIPT, "utf8").digest("base64");
    expect(THEME_INIT_SCRIPT_SHA256).toBe(`sha256-${digest}`);
  });
});
