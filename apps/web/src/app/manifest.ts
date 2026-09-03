import type { MetadataRoute } from "next";

import { siteName, siteTagline } from "@/shared/seo";

const manifest = (): MetadataRoute.Manifest => ({
  name: `${siteName}: ${siteTagline}`,
  short_name: siteName,
  description:
    "Shop clothing from Nepali brands, paired with real creator looks. One cart, delivered across Nepal.",
  start_url: "/",
  display: "standalone",
  background_color: "#ffffff",
  theme_color: "#ffffff",
  categories: ["shopping", "lifestyle"],
  icons: [{ src: "/logo.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
});

export default manifest;
