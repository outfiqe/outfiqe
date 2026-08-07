import type { MetadataRoute } from "next";

const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";

// Static routes for now. Once product/category pages exist, extend this to
// fetch their slugs from the API and map them in alongside these — Next
// regenerates this route on each request (or on a revalidate interval, see
// https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap),
// so there's no separate build step to remember.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
  ];
}
