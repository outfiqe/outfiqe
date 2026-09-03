import type { MetadataRoute } from "next";

import { appShortcuts, LIGHT_THEME_COLOR, toManifestIcons } from "@/features/pwa";
import { siteName, siteTagline } from "@/shared/seo";

const PWA_APP_ID = "/";

const PWA_START_URL = "/?source=pwa";

const PWA_SCOPE = "/";

const manifest = (): MetadataRoute.Manifest => ({
  id: PWA_APP_ID,
  name: `${siteName}: ${siteTagline}`,
  short_name: siteName,
  description:
    "Shop clothing from Nepali brands, paired with real creator looks. One cart, delivered across Nepal.",
  start_url: PWA_START_URL,
  scope: PWA_SCOPE,
  display: "standalone",
  display_override: ["standalone", "minimal-ui"],
  orientation: "any",
  lang: "en",
  dir: "ltr",
  background_color: LIGHT_THEME_COLOR,
  theme_color: LIGHT_THEME_COLOR,
  categories: ["shopping", "lifestyle", "social"],
  icons: toManifestIcons(),
  shortcuts: appShortcuts,
});

export default manifest;
