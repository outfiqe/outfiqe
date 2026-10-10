export const APPLE_SPLASH_DIRECTORY = "/splash";

export type AppleSplashScreen = {
  deviceWidth: number;
  deviceHeight: number;
  pixelRatio: number;
};

export const appleSplashScreens: AppleSplashScreen[] = [
  { deviceWidth: 440, deviceHeight: 956, pixelRatio: 3 },
  { deviceWidth: 430, deviceHeight: 932, pixelRatio: 3 },
  { deviceWidth: 414, deviceHeight: 896, pixelRatio: 3 },
  { deviceWidth: 414, deviceHeight: 896, pixelRatio: 2 },
  { deviceWidth: 402, deviceHeight: 874, pixelRatio: 3 },
  { deviceWidth: 393, deviceHeight: 852, pixelRatio: 3 },
  { deviceWidth: 390, deviceHeight: 844, pixelRatio: 3 },
  { deviceWidth: 375, deviceHeight: 812, pixelRatio: 3 },
  { deviceWidth: 375, deviceHeight: 667, pixelRatio: 2 },
  { deviceWidth: 1024, deviceHeight: 1366, pixelRatio: 2 },
  { deviceWidth: 834, deviceHeight: 1194, pixelRatio: 2 },
  { deviceWidth: 820, deviceHeight: 1180, pixelRatio: 2 },
  { deviceWidth: 744, deviceHeight: 1133, pixelRatio: 2 },
];

export const appleSplashFileName = ({
  deviceWidth,
  deviceHeight,
  pixelRatio,
}: AppleSplashScreen): string => `splash-${deviceWidth}x${deviceHeight}@${pixelRatio}x.png`;

export const appleSplashPath = (screen: AppleSplashScreen): string =>
  `${APPLE_SPLASH_DIRECTORY}/${appleSplashFileName(screen)}`;
