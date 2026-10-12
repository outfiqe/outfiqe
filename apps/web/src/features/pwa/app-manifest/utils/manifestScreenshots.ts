import { existsSync } from "node:fs";
import path from "node:path";

import type { MetadataRoute } from "next";

import { type AppScreenshot, appScreenshotPath, appScreenshots } from "../constants/appScreenshots";

type ManifestScreenshot = NonNullable<MetadataRoute.Manifest["screenshots"]>[number];

export const buildManifestScreenshots = (screenshots: AppScreenshot[]): ManifestScreenshot[] =>
  screenshots.map((screenshot) => ({
    src: appScreenshotPath(screenshot.fileName),
    sizes: screenshot.size,
    type: "image/png",
    form_factor: screenshot.formFactor,
    label: screenshot.label,
  }));

const screenshotsOnDisk = path.join(process.cwd(), "public", "screenshots");

export const toManifestScreenshots = (): ManifestScreenshot[] =>
  buildManifestScreenshots(
    appScreenshots.filter((screenshot) =>
      existsSync(path.join(screenshotsOnDisk, screenshot.fileName)),
    ),
  );
