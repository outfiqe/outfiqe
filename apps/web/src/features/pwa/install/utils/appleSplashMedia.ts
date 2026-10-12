import type { AppleSplashScreen } from "../constants/appleSplashScreens";

export const toAppleSplashMediaQuery = ({
  deviceWidth,
  deviceHeight,
  pixelRatio,
}: AppleSplashScreen): string =>
  [
    `(device-width: ${deviceWidth}px)`,
    `(device-height: ${deviceHeight}px)`,
    `(-webkit-device-pixel-ratio: ${pixelRatio})`,
    "(orientation: portrait)",
  ].join(" and ");
