# shared/seo

## Purpose

The SEO infrastructure shared by every page in `apps/web`: page-metadata construction (title,
description, canonical, Open Graph, Twitter, robots), JSON-LD structured data builders, the visual
`Breadcrumbs` component, and the data sources that feed `app/sitemap.ts`. One place so every route
produces consistent, valid metadata instead of hand-rolling a `Metadata` object per file.

## Structure

- `siteConfig.ts` — canonical site name, tagline, description, and `siteUrl` (from `SITE_URL`, the
  same env var `robots.ts`/`sitemap.ts` already read). `absoluteUrl(path)` turns an app path into a
  fully-qualified URL. `contactEmail` and `socialProfileUrls` come from
  `NEXT_PUBLIC_CONTACT_EMAIL` / `NEXT_PUBLIC_SOCIAL_URLS` and are empty until set — nothing renders
  a placeholder contact detail.
- `metadata.ts` — `buildPageMetadata(input)` is the single helper every page's `generateMetadata`
  (or static `metadata`) calls. It always sets `alternates.canonical` and a `robots` block, and
  only adds `openGraph.images` when a real image is passed (otherwise the file-based
  `app/opengraph-image` fallback applies once one exists). `noIndexMetadata(title)` is the shortcut
  for utility pages. `rootMetadataDefaults` is spread into `app/layout.tsx`'s `metadata`.
- `jsonLd.tsx` — `<JsonLd id data />` renders one `<script type="application/ld+json">` (a plain
  `<script>`, the pattern the Next docs recommend for structured data, not `next/script`), with
  `<` escaped so the payload can't break out of the tag. The builder functions
  (`organizationSchema`, `websiteSchema` with a `SearchAction`, `breadcrumbSchema`, `productSchema`
  with `Offer`/`AggregateRating`, `itemListSchema`, `collectionPageSchema`, `brandStoreSchema`,
  `profilePageSchema`, `faqPageSchema`) return plain objects — pure, unit-tested.
- `Breadcrumbs.tsx` — the visual breadcrumb trail (`<nav aria-label="Breadcrumb">` + `<ol>`) that
  also emits its own `BreadcrumbList` JSON-LD, so a page adds breadcrumbs and their schema in one
  component.
- `routes.ts` — the registry of static marketing/legal routes (used by `sitemap.ts` and available
  for footer/nav wiring) and `crawlerDisallowedPaths` (used by `robots.ts`). Adding a marketing
  page means adding one line here so it lands in the sitemap.
- `sitemapSources.ts` — `server-only` fetchers that page through the public API for product, brand,
  collection, category and top-creator URLs. Each fails soft (returns `[]`) so one slow or broken
  endpoint never 500s the whole sitemap. Cached via `fetch`'s `next.revalidate` (6 hours).
- `index.ts` — the barrel every page imports from (`@/shared/seo`).

## Funnel

**Technical:** a route's `generateMetadata` → `buildPageMetadata` → a `Metadata` object with a
canonical and robots block. The route body renders `<Breadcrumbs>` and one or more `<JsonLd>`
nodes. `app/sitemap.ts` → `routes.ts` (static) + `sitemapSources.ts` (dynamic) → one
`MetadataRoute.Sitemap`. `app/robots.ts` → `crawlerDisallowedPaths`.

## Non-obvious rationale

- **`buildPageMetadata` only sets `openGraph.images` when given a real image.** A per-page OG image
  that points at a non-existent asset is worse than none. Pages without a natural image (most
  marketing pages) omit it and inherit whatever `app/opengraph-image` provides once that file
  exists — see the follow-up below.
- **Canonical is always set, even on filtered `/shop` URLs.** `/shop?category=streetwear` sets its
  own canonical to exactly that URL rather than `/shop`, so the filtered view is its own indexable
  page and there is no ambiguity for a crawler. This works with the shop feature's deliberate
  query-param design (see `features/shop/README.md`) rather than against it.
- **`contactEmail` / `socialProfileUrls` are env-driven and empty by default.** The Organization
  schema's `contactPoint` / `sameAs` and the Contact page's direct-contact block only render when
  those are set, so nothing ships a guessed email address or a link to a social account that may
  not exist.
- **`sitemapSources` uses `fetch` with `next.revalidate`, not the app's `serverApiRequest`.** That
  helper forces `cache: "no-store"`, which is right for personalised page data but wrong for a
  sitemap that should be cached and rebuilt on an interval.
- **Site-wide indexing is gated by the `SEO_INDEXABLE` env var, enforced in `next.config.ts`.**
  Unless `SEO_INDEXABLE=true`, every response carries an `X-Robots-Tag: noindex, nofollow` header,
  which Google honours identically to the `<meta robots>` tag and covers every route (pages,
  `sitemap.xml`, `robots.txt`, images), not just pages built through `buildPageMetadata`. Set it to
  `true` only on the production environment at launch; preview and staging deployments leave it
  unset so their URLs never enter search results. While it is unset, `buildPageMetadata` still
  emits a per-page `index` directive — the header's `noindex` is the more restrictive signal and
  wins, so the site stays out of the index.

## Follow-ups

- `app/opengraph-image.tsx` (a generated default OG image via `next/og`) and a real `favicon.ico` /
  `apple-touch-icon` are not in this change — `logo.svg` is the only brand asset in `public/`.
  Until they exist, social shares fall back to no image and the favicon is the SVG logo.
- A Content-Security-Policy is still not set (`app/layout.tsx` already reads an `x-nonce` header
  that nothing currently produces). Adding it needs a `middleware.ts` and per-inline-script testing
  and was kept out of this change.
- The `SITE_URL` env var must be the production origin (`https://outfiqe.com`) in the deployed
  build for canonicals, the sitemap and robots to be correct.
