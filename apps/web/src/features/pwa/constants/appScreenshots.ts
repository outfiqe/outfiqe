export type AppScreenshotFormFactor = "narrow" | "wide";

export type AppScreenshot = {
  fileName: string;
  route: string;
  formFactor: AppScreenshotFormFactor;
  size: string;
  label: string;
};

export const SCREENSHOT_DIRECTORY = "/screenshots";

export const NARROW_SCREENSHOT_SIZE = "412x915";

export const WIDE_SCREENSHOT_SIZE = "1280x800";

export const appScreenshots: AppScreenshot[] = [
  {
    fileName: "home-narrow.png",
    route: "/",
    formFactor: "narrow",
    size: NARROW_SCREENSHOT_SIZE,
    label: "Explore looks and shop the pieces in them",
  },
  {
    fileName: "shop-narrow.png",
    route: "/shop",
    formFactor: "narrow",
    size: NARROW_SCREENSHOT_SIZE,
    label: "Browse clothing from Nepali brands",
  },
  {
    fileName: "explore-narrow.png",
    route: "/explore",
    formFactor: "narrow",
    size: NARROW_SCREENSHOT_SIZE,
    label: "See real creator looks",
  },
  {
    fileName: "home-wide.png",
    route: "/",
    formFactor: "wide",
    size: WIDE_SCREENSHOT_SIZE,
    label: "Explore looks and shop the pieces in them",
  },
  {
    fileName: "shop-wide.png",
    route: "/shop",
    formFactor: "wide",
    size: WIDE_SCREENSHOT_SIZE,
    label: "Browse clothing from Nepali brands",
  },
];

export const appScreenshotPath = (fileName: string): string =>
  `${SCREENSHOT_DIRECTORY}/${fileName}`;
