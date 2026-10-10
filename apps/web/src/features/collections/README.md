# collections

## Purpose

Curated collections (seasonal edits, festive looks, occasion picks): the homepage collections section, the `/collections` page, and one collection's page at `/collections/[slug]`.

## Structure

- `components/CollectionsSection.tsx` — the homepage section, a server component that loads the first few collections (`getHomepageCollectionsServer`) and links to `/collections`. It shows an empty state when there are none.
- `components/CollectionsGrid.tsx` — the `/collections` grid, loading more as the visitor scrolls (`useLoadMoreOnVisible`), with skeleton, error and empty states.
- `components/CollectionCard.tsx` — one collection tile.
- `components/CollectionGridSkeleton.tsx` — the grid's loading state.
- `components/CollectionDetail.tsx` — one collection's page: its header and an infinite grid of its products, drawn with `landing`'s `ProductCard`.
- `api/collectionsApi.ts`, `api/collectionSchemas.ts` — the client-side calls (`list`, one collection, its products) and their shapes.
- `api/getCollectionsServer.ts`, `api/getCollectionDetailServer.ts` — server-side fetches for the homepage section and for the collection page's metadata and first render.
- `hooks/useInfiniteCollections.ts`, `hooks/useInfiniteCollectionProducts.ts` — cursor-paginated queries for the grid and a collection's products.
- `index.ts` — what the routes import.

## Funnel

**User-facing:** a visitor sees a few collections on the homepage → opens `/collections` and scrolls through them → opens one and browses its pieces, then a piece's own page.

**Technical:** `app/(home)/@collections/page.tsx` → `CollectionsSection` → `getHomepageCollectionsServer` → `GET /api/collections?limit=6`. `app/collections/page.tsx` → `CollectionsGrid` → `useInfiniteCollections` → `GET /api/collections`. `app/collections/[slug]/page.tsx` → `getCollectionDetailServer` (title, description and JSON-LD; a missing collection is a 404) → `CollectionDetail` → `useInfiniteCollectionProducts` → `GET /api/collections/:slug/products` (`apps/api/src/modules/collections`).

## Non-obvious rationale

**The server fetches never throw.** `getHomepageCollectionsServer` returns `[]` and `getCollectionDetailServer` returns `null` when the API fails, so an outage shows the section's empty state, or a "not found" page, instead of breaking the homepage (see `app/(home)/README.md`).

**A collection's products wait for auth to resolve.** `useInfiniteCollectionProducts` is enabled only once `isAuthResolved` is true, because the product list carries a per-viewer `isSaved` and must be fetched as the right viewer.
