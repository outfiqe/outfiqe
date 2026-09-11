import { describe, expect, it } from "vitest";

import { BADGE_ICON_REFERENCE_SIZE_PX } from "./achievement-badge-icon.constants";
import { layerBorderWidthPx, layerFontSizePx } from "./studio-badge-visual.utils";

describe("layerFontSizePx", () => {
  it("reads the stored value as a percentage of the reference badge size by default", () => {
    expect(layerFontSizePx(50)).toBe((50 / 100) * BADGE_ICON_REFERENCE_SIZE_PX);
  });

  it("scales to whatever badge box the caller is rendering into", () => {
    const canvasPx = 320;
    expect(layerFontSizePx(50, canvasPx)).toBe(160);
    expect(layerFontSizePx(50, canvasPx) / canvasPx).toBe(
      layerFontSizePx(50) / BADGE_ICON_REFERENCE_SIZE_PX,
    );
  });
});

describe("layerBorderWidthPx", () => {
  it("returns the stored px value unchanged at the reference size", () => {
    expect(layerBorderWidthPx(4)).toBe(4);
  });

  it("scales the border width proportionally for a larger canvas", () => {
    expect(layerBorderWidthPx(BADGE_ICON_REFERENCE_SIZE_PX, BADGE_ICON_REFERENCE_SIZE_PX * 2)).toBe(
      BADGE_ICON_REFERENCE_SIZE_PX * 2,
    );
    expect(layerBorderWidthPx(2, 320)).toBeCloseTo((2 / BADGE_ICON_REFERENCE_SIZE_PX) * 320);
  });
});
