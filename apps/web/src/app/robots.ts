import type { MetadataRoute } from "next";

const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // No account/auth pages indexed — nothing to rank there.
      disallow: ["/login"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
