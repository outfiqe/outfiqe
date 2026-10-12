# landing

## Purpose

The sections of the public homepage (`/`): the hero carousel, the taste picker and its results, trending, on sale, creator looks, new arrivals and the brand callout. The collections section comes from `collections`. How the sections are put together on the page is in `app/(home)/README.md`.

## Structure

- `components/Hero.tsx`, `components/HeroCarousel.tsx` — the hero slides set in the admin (`getHeroSlidesServer`); `Hero` renders nothing when there are no slides.
- `components/TasteCategories.tsx` — the taste picker: the visitor's chosen categories, with `CustomizeTasteModal` to pick and reorder them.
- `components/CustomizeTasteModal.tsx` — choose which categories show and drag them into order.
- `components/CategoryResults.tsx` — the product grid for the picked category and product type, loading more on scroll.
- `components/TrendingNow.tsx`, `components/SaleRail.tsx`, `components/NewArrivals.tsx` — product rails (server components) over `ProductRail`.
- `components/CreatorLooks.tsx`, `components/LookCard.tsx` — featured creator looks.
- `components/ProductRail.tsx` — a titled, horizontally scrolling row of `ProductCard`s with a "see more" link.
- `components/ProductCard.tsx` — one product tile with its save (heart) button. Also used by `collections` and other product grids, through `products`' `toExploreProduct`.
- `components/BrandCallout.tsx` — the static "list your brand" band at the bottom.
- `context/CategorySelectionContext.tsx` — the picked taste categories, shared by `TasteCategories` and `CategoryResults`.
- `utils/resolveTasteCategories.ts` — `resolveDisplayCategories` and `resolveActiveCategorySlug`, used on the server and in the browser so both pick the same categories.
- `utils/scrollToTasteResults.ts` — scrolls the results into view after a pick.
- `api/getHeroSlidesServer.ts`, `api/heroSlideSchemas.ts` — the hero slides fetch.
- `index.ts` — what the home route's slots import.

## Funnel

**User-facing:** a visitor opens `/`, flips through the hero, picks a taste and sees matching pieces below, then scrolls past trending, sale, collections, creator looks and new arrivals.

**Technical:** each `app/(home)/@<slot>/page.tsx` renders one section here. The rails fetch on the server through `products`' server fetchers (`getTrendingProductsServer`, `getSaleProductsServer`, `getNewArrivalsServer`, `getFeaturedCreatorLooksServer`); the taste slot prefetches into React Query and hydrates `TasteCategories` and `CategoryResults` (see `app/(home)/README.md`).

## Non-obvious rationale

**`SaleRail` renders nothing when nothing is on sale, unlike the other rails, which show an empty state.** An empty promotional section works against its own purpose, so the sale rail simply isn't there until a product has an active discount. The API returns an empty list for an empty sale pool for the same reason (`apps/api/src/modules/products`).
