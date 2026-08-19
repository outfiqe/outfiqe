# Brand Profile

## Purpose

The public-facing brand storefront page: a brand's banner, avatar, stats (products/followers/
rating), a follow toggle, and its product catalog filterable by product type with infinite scroll.

## Structure

- `components/BrandProfile.tsx` — the page's client component: header, follow toggle, type filters,
  and the product grid.
- `api/brandProfileApi.ts` — client-side API calls used by the infinite-products hook.
- `api/brandProfileSchemas.ts` — Zod schema for a brand profile record.
- `api/getBrandProfileServerPublic.ts` — server-only fetch used for the initial SSR render; returns
  `null` on any failure instead of throwing, so the page can render a not-found state rather than
  crash.
- `hooks/useInfiniteBrandProducts.ts` — infinite-query wrapper (`@outfiqe/hooks`'
  `useInfiniteCursorPage`) over `brandProfileApi.listProducts`, keyed by brand id + product type.
- `hooks/useInfiniteBrandProducts.integration.test.tsx` — colocated integration test; renders the
  hook against a mocked API (MSW) to verify first-page fetch and cursor-based pagination.
- `index.ts` — the feature's public exports.

## Funnel

**User-facing:** a visitor opens a brand's profile page, sees the brand header and its products,
optionally filters by product type, and scrolls to load more. Following the brand requires being
logged in — an unauthenticated visitor is redirected to login with a return path back to the
profile.

**Technical:** the route's server component calls `getBrandProfileServerPublic` for the initial
render (server-only, uses the visitor's session if present for a personalized `isFollowing`/
`followerCount`), then hands off to the client `BrandProfile` component, which drives further
product pages through `useInfiniteBrandProducts` → `brandProfileApi` → the API client →
`apps/api`'s brand/product endpoints.
