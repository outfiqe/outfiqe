import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const TOKENS_CSS = readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "tokens.css"),
  "utf8",
);
const WCAG_AA_TEXT_CONTRAST = 4.5;
const DEGREES_PER_HUE_STEP = 30;
const HUE_STEPS = 12;
const PERCENT = 100;
const LINEAR_THRESHOLD = 0.03928;
const LOW_LIGHT_DIVISOR = 12.92;
const GAMMA = 2.4;
const GAMMA_OFFSET = 0.055;
const GAMMA_SCALE = 1.055;
const LUMINANCE_FLARE = 0.05;
const RED_WEIGHT = 0.2126;
const GREEN_WEIGHT = 0.7152;
const BLUE_WEIGHT = 0.0722;

type Rgb = [number, number, number];

const themeBlock = (selector: string): string => {
  const start = TOKENS_CSS.indexOf(`${selector} {`);
  return TOKENS_CSS.slice(start, TOKENS_CSS.indexOf("}", start));
};

const tokenRgb = (block: string, token: string): Rgb => {
  const match = block.match(new RegExp(`--${token}:\\s*([\\d.]+)\\s+([\\d.]+)%\\s+([\\d.]+)%`));
  if (!match) throw new Error(`--${token} is missing from tokens.css`);
  const [hue, saturation, lightness] = match.slice(1).map(Number);
  const chroma = (saturation / PERCENT) * Math.min(lightness / PERCENT, 1 - lightness / PERCENT);
  const channel = (offset: number) => {
    const step = (offset + hue / DEGREES_PER_HUE_STEP) % HUE_STEPS;
    return lightness / PERCENT - chroma * Math.max(-1, Math.min(step - 3, 9 - step, 1));
  };
  return [channel(0), channel(8), channel(4)];
};

const relativeLuminance = (rgb: Rgb): number => {
  const [red, green, blue] = rgb.map((value) =>
    value <= LINEAR_THRESHOLD
      ? value / LOW_LIGHT_DIVISOR
      : ((value + GAMMA_OFFSET) / GAMMA_SCALE) ** GAMMA,
  );
  return RED_WEIGHT * red + GREEN_WEIGHT * green + BLUE_WEIGHT * blue;
};

const contrastRatio = (first: Rgb, second: Rgb): number => {
  const [lighter, darker] = [relativeLuminance(first), relativeLuminance(second)].sort(
    (left, right) => right - left,
  );
  return (lighter + LUMINANCE_FLARE) / (darker + LUMINANCE_FLARE);
};

const TEXT_ON_SURFACE_PAIRS: [string, string][] = [
  ["foreground", "background"],
  ["foreground", "card"],
  ["muted-foreground", "background"],
  ["muted-foreground", "card"],
  ["muted-foreground", "muted"],
  ["primary-strong", "background"],
  ["primary-strong", "card"],
];

describe.each([
  ["light", themeBlock(":root")],
  ["dark", themeBlock(".dark")],
])("%s theme text colors", (_themeName, block) => {
  it.each(TEXT_ON_SURFACE_PAIRS)("%s on %s meets WCAG AA for body text", (text, surface) => {
    const ratio = contrastRatio(tokenRgb(block, text), tokenRgb(block, surface));
    expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_TEXT_CONTRAST);
  });
});
