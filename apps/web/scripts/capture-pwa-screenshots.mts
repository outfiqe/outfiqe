import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

import {
  type AppScreenshot,
  appScreenshots,
} from "../src/features/pwa/constants/appScreenshots.ts";

const webAppRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const screenshotOutputDirectory = path.join(webAppRoot, "public", "screenshots");

const baseUrl = process.env.SCREENSHOT_BASE_URL ?? "http://127.0.0.1:3100";

const SETTLE_AFTER_LOAD_MS = 2_000;

const viewportForScreenshot = ({ formFactor, size }: AppScreenshot) => {
  const [width, height] = size.split("x").map(Number);
  return { width, height, deviceScaleFactor: formFactor === "narrow" ? 2 : 1 };
};

const captureScreenshots = async () => {
  await mkdir(screenshotOutputDirectory, { recursive: true });

  const browser = await chromium.launch();
  try {
    for (const screenshot of appScreenshots) {
      const { deviceScaleFactor, ...viewport } = viewportForScreenshot(screenshot);
      const page = await browser.newPage({ viewport, deviceScaleFactor });

      await page.goto(`${baseUrl}${screenshot.route}`, {
        waitUntil: "networkidle",
        timeout: 30_000,
      });
      await page.waitForTimeout(SETTLE_AFTER_LOAD_MS);
      await page.screenshot({
        path: path.join(screenshotOutputDirectory, screenshot.fileName),
      });

      await page.close();
      process.stdout.write(`captured ${screenshot.fileName}\n`);
    }
  } finally {
    await browser.close();
  }
};

await captureScreenshots();
