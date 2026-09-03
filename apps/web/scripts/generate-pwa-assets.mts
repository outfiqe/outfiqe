import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import {
  appIconFileName,
  APPLE_TOUCH_ICON_SIZE,
  installAppIcons,
  MASKABLE_SAFE_ZONE_RATIO,
} from "../src/features/pwa/constants/appIcons.ts";
import {
  appleSplashFileName,
  appleSplashScreens,
} from "../src/features/pwa/constants/appleSplashScreens.ts";
import { LIGHT_THEME_COLOR } from "../src/features/pwa/constants/appTheme.ts";

const SVG_RENDER_DENSITY = 512;

const SPLASH_LOGO_RATIO = 0.3;

const OPAQUE_ALPHA = 1;

const RGB_CHANNEL_COUNT = 3;

const HEX_RADIX = 16;

const HEX_PAIR_LENGTH = 2;

const webAppRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const publicDirectory = path.join(webAppRoot, "public");

const iconOutputDirectory = path.join(publicDirectory, "icons");

const splashOutputDirectory = path.join(publicDirectory, "splash");

const logoSourcePath = path.join(publicDirectory, "logo.svg");

const toRgbBackground = (hexColor: string) => {
  const channels = Array.from({ length: RGB_CHANNEL_COUNT }, (_unused, channelIndex) =>
    parseInt(
      hexColor.slice(
        channelIndex * HEX_PAIR_LENGTH + 1,
        channelIndex * HEX_PAIR_LENGTH + 1 + HEX_PAIR_LENGTH,
      ),
      HEX_RADIX,
    ),
  );

  const [red, green, blue] = channels;
  return { r: red, g: green, b: blue, alpha: OPAQUE_ALPHA };
};

const themeBackground = toRgbBackground(LIGHT_THEME_COLOR);

const renderLogo = (source: Buffer, size: number) =>
  sharp(source, { density: SVG_RENDER_DENSITY }).resize(size, size).png().toBuffer();

const composeOnThemeBackground = async (
  logo: Buffer,
  canvasWidth: number,
  canvasHeight: number,
) =>
  sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 4,
      background: themeBackground,
    },
  })
    .composite([{ input: logo, gravity: "centre" }])
    .png()
    .toBuffer();

const generateInstallIcons = async (source: Buffer) => {
  await Promise.all(
    installAppIcons.map(async ({ size, purpose }) => {
      const isMaskable = purpose === "maskable";
      const renderedSize = isMaskable ? Math.round(size * MASKABLE_SAFE_ZONE_RATIO) : size;
      const logo = await renderLogo(source, renderedSize);
      const icon = isMaskable ? await composeOnThemeBackground(logo, size, size) : logo;

      await writeFile(path.join(iconOutputDirectory, appIconFileName({ size, purpose })), icon);
    }),
  );
};

const generateAppleTouchIcon = async (source: Buffer) => {
  const logo = await renderLogo(source, APPLE_TOUCH_ICON_SIZE);
  const icon = await composeOnThemeBackground(
    logo,
    APPLE_TOUCH_ICON_SIZE,
    APPLE_TOUCH_ICON_SIZE,
  );

  await writeFile(path.join(iconOutputDirectory, "apple-touch-icon.png"), icon);
};

const generateAppleSplashScreens = async (source: Buffer) => {
  await Promise.all(
    appleSplashScreens.map(async (screen) => {
      const { deviceWidth, deviceHeight, pixelRatio } = screen;
      const canvasWidth = deviceWidth * pixelRatio;
      const canvasHeight = deviceHeight * pixelRatio;
      const logoSize = Math.round(Math.min(canvasWidth, canvasHeight) * SPLASH_LOGO_RATIO);
      const logo = await renderLogo(source, logoSize);
      const splash = await composeOnThemeBackground(logo, canvasWidth, canvasHeight);

      await writeFile(path.join(splashOutputDirectory, appleSplashFileName(screen)), splash);
    }),
  );
};

const generatePwaAssets = async () => {
  await mkdir(iconOutputDirectory, { recursive: true });
  await mkdir(splashOutputDirectory, { recursive: true });

  const source = await readFile(logoSourcePath);

  await generateInstallIcons(source);
  await generateAppleTouchIcon(source);
  await generateAppleSplashScreens(source);
};

await generatePwaAssets();
