import { describe, expect, it } from "vitest";

import { appleSplashScreens } from "../constants/appleSplashScreens";
import { toAppleSplashMediaQuery } from "./appleSplashMedia";

describe("toAppleSplashMediaQuery", () => {
  it("pins a device by size, pixel ratio, and orientation", () => {
    expect(toAppleSplashMediaQuery({ deviceWidth: 390, deviceHeight: 844, pixelRatio: 3 })).toBe(
      "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
    );
  });

  it("never produces a query that shadows another device", () => {
    const mediaQueries = appleSplashScreens.map(toAppleSplashMediaQuery);

    expect(new Set(mediaQueries).size).toBe(appleSplashScreens.length);
  });
});
