# products

## Purpose

The shared product data layer: product lists, product types and size options, used by the homepage, shop, search, collections, the brand dashboard and the outfit builder. It has no pages or components of its own.

## Structure

- `api/productsApi.ts`, `api/productSchemas.ts` — the client calls (`list` with filters and a cursor, `autocomplete`) and the `PublicProduct` / `ProductPage` shapes.
- `api/getProductsServer.ts` — server-side fetches: a first page of products, trending, sale, new arrivals and featured creator looks.
- `api/productTypesApi.ts`, `api/getProductTypesServer.ts` — product types (all, or the ones a brand can assign), client and server.
- `api/sizeOptionsApi.ts`, `api/sizeOptionSchemas.ts` — the size options for a product type.
- `api/toExploreProduct.ts` — maps a `PublicProduct` to the shape `landing`'s `ProductCard` draws.
- `hooks/useInfiniteProducts.ts` — cursor-paginated product lists.
- `hooks/useProductAutocomplete.ts` — product suggestions for the search box.
- `hooks/useProductTypes.ts` — `useProductTypes` and `useAssignableProductTypes`.
- `hooks/useSizeOptions.ts` — size options for one product type.
- `index.ts` — what other features import.

## Funnel

**User-facing:** none of its own. Anywhere a visitor sees a list of products, a product type filter or a size list, the data comes from here.

**Technical:** browser components → these hooks → `productsApi` / `productTypesApi` / `sizeOptionsApi` → `GET /api/products`, `/api/products/autocomplete`, `/api/product-types`, `/api/size-options` (`apps/api/src/modules/products`, `product-types`, `size-options`). Server components → `getProductsServer.ts` / `getProductTypesServer.ts` → the same endpoints through `serverApiRequest`.

## Non-obvious rationale

**The server fetchers send the viewer's access token and never throw.** Products carry a per-viewer `isSaved`, so a server render has to be fetched as the viewer to show the right heart state. And because the homepage rails render on the server, each fetcher returns `[]` (or `null` for a first page) when the API fails, so one failing rail shows its empty state instead of taking the page down (see `app/(home)/README.md`).
