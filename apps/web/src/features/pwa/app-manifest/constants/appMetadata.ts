import type { Metadata } from "next";

import { siteName } from "@/shared/seo/siteConfig";

import {
  APPLE_TOUCH_ICON_PATH,
  APPLE_TOUCH_ICON_SIZE,
  PNG_MIME_TYPE,
  SCALABLE_ICON_PATH,
  SVG_MIME_TYPE,
} from "./appIcons";

export const WEB_MANIFEST_PATH = "/manifest.webmanifest";

const APPLE_STATUS_BAR_STYLE = "default";

export const pwaIcons: Metadata["icons"] = {
  icon: [{ url: SCALABLE_ICON_PATH, type: SVG_MIME_TYPE }],
  apple: [
    {
      url: APPLE_TOUCH_ICON_PATH,
      sizes: `${APPLE_TOUCH_ICON_SIZE}x${APPLE_TOUCH_ICON_SIZE}`,
      type: PNG_MIME_TYPE,
    },
  ],
};

export const appleWebAppMetadata: Metadata["appleWebApp"] = {
  capable: true,
  title: siteName,
  statusBarStyle: APPLE_STATUS_BAR_STYLE,
};
