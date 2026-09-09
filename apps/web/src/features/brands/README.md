# Brands

## Purpose

The public brand directory at `/brands`: a paginated, infinite-scroll grid of every Nepali label on
Outfiqe, each card showing the brand's banner, avatar, product and follower counts, and a follow
toggle.

## Structure

- `components/BrandsGrid.tsx` — client component that drives the grid: reads the infinite query,
  renders loading / error / empty states, and wires the load-more sentinel.
- `components/BrandCard.tsx` — a single brand card with its optimistic follow toggle.
- `components/BrandGridSkeleton.tsx` — the loading placeholder (`role="status"`, "Loading brands").
- `api/brandsApi.ts` — client-side `GET /brands` call, cursor-paginated.
- `api/brandsSchemas.ts` — Zod schemas for a brand summary and a page of brands. A brand summary is
  the same shape as a full brand profile (`brand-profile` feature's `brandProfileSchema`).
- `api/serverBrands.ts` — server-only first-page fetch used for SSR prefetch; forwards the visitor's
  session token so `isFollowing` / `followerCount` are personalized in the initial HTML.
- `hooks/useInfiniteBrands.ts` — `useInfiniteCursorPage` wrapper over `brandsApi.list`, keyed by
  `BRANDS_QUERY_KEY`. Takes an `enabled` flag so the caller can hold the request until auth resolves.
- `brands.constants.ts` — grid classes, follow/stat labels, the login redirect path, and
  `BRANDS_QUERY_KEY` (shared by the SSR prefetch, the client hook, and the post-follow invalidation).
- `index.ts` — public exports (`BrandsGrid`, `BrandSummary`).

## Funnel

**User-facing:** a visitor opens `/brands`, sees the grid (server-rendered first page, then infinite
scroll), and can follow any brand from its card. Following while logged out sends them to login with
a return path back to `/brands`; the follow button flips immediately and the follower count adjusts,
reverting if the request fails.

**Technical:** `app/brands/page.tsx` (server component) prefetches the first page through
`getBrandsFirstPageServer` → `serverApiRequest` (with the session token) and hands a dehydrated
`["brands"]` query to `BrandsGrid` via `HydrationBoundary`. On the client, `BrandsGrid` reads
`useInfiniteBrands(isAuthResolved)` → `brandsApi.list` → the API client → `GET /api/brands`. Each
`BrandCard` toggles follow through `useOptimisticFollow("brand")` →
`useToggleFollow` → `followApi` → `POST|DELETE /api/follows/brand/:id`, then invalidates
`["brands"]` so counts and `isFollowing` re-converge from the server.

## Non-obvious rationale

- **The client query is gated on `isAuthResolved`.** `GET /brands` uses `optionalAuth`: a request
  sent before the access token is restored returns `200` with `isFollowing: false` for every brand
  (no `401`, so the API client never retries it), and `staleTime` then pins that logged-out snapshot.
  Holding the query until auth resolves — plus the token-forwarding SSR prefetch — keeps the very
  first read personalized. Logged-out visitors resolve synchronously, so they don't wait.
- **`BrandCard` holds no `useState` follow flag.** It renders straight from `brand.isFollowing` with
  only a transient optimistic override inside `useOptimisticFollow`; the override is dropped once the
  refetched query (or a prop change) reports the server value. A one-shot `useState(brand.isFollowing)`
  would ignore the corrected data and strand the button on a stale label.
