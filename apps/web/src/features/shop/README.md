# shop

## Purpose

`/shop` — a full, paginated product listing page driven entirely by query params (`category`, `type`, `sort`), so it stays correct as admins add/rename/remove categories without needing a matching page per category. Exists because the homepage's "View all"/"See More" links (`CategoryResults`, `TrendingNow`) previously pointed nowhere real — one re-filtered the same homepage rail in place, the other was a dead `href="#"`.

## Structure

- `components/ShopResults.tsx` — the whole page body: reads `category`/`type`/`sort` from the URL, resolves `category` against `useCategories()` for its display name, fetches via `useInfiniteProducts`, and renders the same product grid + infinite-scroll sentinel pattern already used by `landing/CategoryResults` and `explore`.

## Funnel

**User-facing:** land on `/shop` from a "View all" (with `category`, optionally `type`) or "See More" (with `sort=trending`) link elsewhere on the site, or navigate there directly. Scroll to load more — no numbered pages.

**Technical:** `ShopResults` → `useInfiniteProducts` (`apps/web/src/features/products`) → `GET /products?category=&type=&sort=&cursor=` — the same cursor-paginated endpoint `landing/CategoryResults` already used, now also accepting `sort` (see `apps/api/src/modules/products/README.md`). No category in the URL means "browse everything," gated only by `sort`.

## Non-obvious rationale

**Not a `/category/[slug]` dynamic route, deliberately.** The page is entirely query-param driven (`/shop?category=slug`) rather than a `[slug]` segment, per the same reasoning `CategoryResults` already had: categories are admin-managed and change often, and a query-param page needs no route regeneration or slug-to-page mapping to stay correct — it just reads whatever `category` value is in the URL and resolves it against the live category list at request time.

**`CategoryTypeFilters` (the type-filter pill row) lives in `@/shared/components`, not here.** It was extracted out of `landing/CategoryResults` once this page became a second consumer, with a `basePath` prop so each caller controls where a filter selection navigates to (`/` for the homepage section, `/shop` here) instead of hardcoding one.
