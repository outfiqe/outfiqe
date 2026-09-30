import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { hslTripletToHex, LIGHT_THEME_BRAND_TOKENS, lightThemeBrandHex } from "./brand-palette";

const readLightThemeTokens = (): Record<string, string> => {
  const tokensCss = readFileSync(join(import.meta.dirname, "..", "tokens.css"), "utf8");
  const lightThemeBlock = /:root\s*\{([^}]*)\}/.exec(tokensCss)?.[1] ?? "";
  return Object.fromEntries(
    [...lightThemeBlock.matchAll(/--([\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [
      name,
      value.trim(),
    ]),
  );
};

describe("LIGHT_THEME_BRAND_TOKENS", () => {
  it("matches the light-theme values in tokens.css, so logo images never drift from the site", () => {
    const tokens = readLightThemeTokens();

    for (const [name, value] of Object.entries(LIGHT_THEME_BRAND_TOKENS)) {
      expect(tokens[name], `--${name} in tokens.css`).toBe(value);
    }
  });
});

describe("hslTripletToHex", () => {
  it("converts design-token HSL triplets to hex", () => {
    expect(hslTripletToHex("0 0% 100%")).toBe("#ffffff");
    expect(hslTripletToHex("0 0% 0%")).toBe("#000000");
    expect(hslTripletToHex("0 100% 50%")).toBe("#ff0000");
    expect(hslTripletToHex("120 100% 25%")).toBe("#008000");
  });

  it("rejects a value that is not an HSL triplet", () => {
    expect(() => hslTripletToHex("#31d6c8")).toThrow("Not an HSL token triplet");
  });
});

describe("lightThemeBrandHex", () => {
  it("resolves the brand primary to its hex colour", () => {
    expect(lightThemeBrandHex("primary")).toBe("#34d5c8");
  });
});
