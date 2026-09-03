import type { MetadataRoute } from "next";

import { siteUrl } from "@/shared/seo";
import { crawlerDisallowedPaths } from "@/shared/seo/routes";

const robots = (): MetadataRoute.Robots => {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: crawlerDisallowedPaths,
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
};

export default robots;
