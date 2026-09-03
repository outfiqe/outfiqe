import { describe, expect, it } from "vitest";

import { appleSplashFileName, appleSplashPath, appleSplashScreens } from "./appleSplashScreens";

describe("appleSplashScreens", () => {
  it("declares a unique file per device", () => {
    const fileNames = appleSplashScreens.map(appleSplashFileName);

    expect(new Set(fileNames).size).toBe(appleSplashScreens.length);
  });

  it("distinguishes devices that share a size but differ in pixel ratio", () => {
    const sharedSizeScreens = appleSplashScreens.filter(
      ({ deviceWidth, deviceHeight }) => deviceWidth === 414 && deviceHeight === 896,
    );

    expect(sharedSizeScreens.map(({ pixelRatio }) => pixelRatio)).toEqual([3, 2]);
  });
});

describe("appleSplashPath", () => {
  it("resolves into the served splash directory as a png", () => {
    expect(appleSplashPath({ deviceWidth: 393, deviceHeight: 852, pixelRatio: 3 })).toBe(
      "/splash/splash-393x852@3x.png",
    );
  });
});
