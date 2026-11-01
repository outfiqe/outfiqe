# products

## Purpose

The shared product data layer: product lists and product types, used by the homepage, shop, search, collections, the brand dashboard and the outfit builder. It has no pages or components of its own.

## Structure

- `api/productsApi.ts`, `api/productSchemas.ts` — the client calls (`list` with filters and a cursor, `autocomplete`) and the `PublicProduct` / `ProductPage` shapes.
- `api/getProductsServer.ts` — server-side fetches: a first page of products, trending, sale, new arrivals and featured creator looks.
- `api/productTypesApi.ts`, `api/getProductTypesServer.ts` — product types (all, or the ones a brand can assign), each with `supportsFitRanges` (whether it takes a size chart), client and server.
- `api/toExploreProduct.ts` — maps a `PublicProduct` to the shape `landing`'s `ProductCard` draws.
- `components/ProductsLoadError.tsx` — the "couldn't load, try again" message shared by the shop, search and category lists, so a failed request never reads as an empty catalogue.
- `hooks/useInfiniteProducts.ts` — cursor-paginated product lists.
- `hooks/useProductAutocomplete.ts` — product suggestions for the search box.
- `hooks/useProductTypes.ts` — `useProductTypes` and `useAssignableProductTypes`.
- `index.ts` — what other features import.

## Funnel

**User-facing:** none of its own. Anywhere a visitor sees a list of products or a product type filter, the data comes from here. Sizes are brand-defined and come with each product (see `brand-dashboard` and `size-fit`).

**Technical:** browser components → these hooks → `productsApi` / `productTypesApi` → `GET /api/products`, `/api/products/autocomplete`, `/api/product-types` (`apps/api/src/modules/products`, `product-types`). Server components → `getProductsServer.ts` / `getProductTypesServer.ts` → the same endpoints through `serverApiRequest`.

## Non-obvious rationale

**The server fetchers send the viewer's access token and never throw.** Products carry a per-viewer `isSaved`, so a server render has to be fetched as the viewer to show the right heart state. And because the homepage rails render on the server, each fetcher returns `[]` (or `null` for a first page) when the API fails, so one failing rail shows its empty state instead of taking the page down (see `app/(home)/README.md`).
