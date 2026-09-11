# Brands

## Purpose

The public brand directory at `/brands`: a paginated, infinite-scroll grid of every Nepali label on
Outfiqe, each card showing the brand's banner, avatar, product and follower counts, and a follow
toggle.

## Structure

- `components/BrandsGrid.tsx` — client component that drives the grid: reads the infinite query,
  renders loading / error / empty states, and wires the load-more sentinel.
- `components/BrandCard.tsx` — a single brand card with its optimistic follow toggle.
- `components/BrandGridSkeleton.tsx` — the loading placeholder (`role="status"`, "Loading brands"),
  exported for `app/brands/loading.tsx` as well as the in-grid loading state.
- `api/brandsApi.ts` — client-side `GET /brands` call, cursor-paginated.
- `api/brandsSchemas.ts` — Zod schemas for a brand summary and a page of brands. A brand summary is
  the same shape as a full brand profile (`brand-profile` feature's `brandProfileSchema`).
- `api/serverBrands.ts` — server-only first-page fetch used for SSR prefetch; forwards the visitor's
  session token so `isFollowing` / `followerCount` are personalized in the initial HTML.
- `hooks/useInfiniteBrands.ts` — `useInfiniteCursorPage` wrapper over `brandsApi.list`, keyed by
  `BRANDS_QUERY_KEY`. Takes an `enabled` flag so the caller can hold the request until auth resolves.
- `brands.constants.ts` — grid classes, follow/stat labels, the login redirect path, and
  `BRANDS_QUERY_KEY` (shared by the SSR prefetch, the client hook, and the post-follow invalidation).
- `index.ts` — public exports (`BrandsGrid`, `BrandGridSkeleton`, `BrandSummary`).
- `app/brands/loading.tsx` (route file, not in this feature dir) — the route-level loading UI: the
  real static page header + `BrandGridSkeleton`. See "Why `/brands` needs a route `loading.tsx`".

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

- **Why `/brands` needs a route `loading.tsx`.** The page's server prefetch
  (`getBrandsFirstPageServer`) forwards the session token, so per `serverApiClient` it is
  `cache: "no-store"` — every navigation to `/brands` blocks the RSC render on a fresh `GET /brands`
  round-trip (the price of a personalised first paint — see the `isAuthResolved` bullet). `/shop`
  doesn't have this stall because it only server-fetches cached categories and streams its grid
  behind `<Suspense>`; `/explore` blocks the same way but has always had a `loading.tsx`. Without
  one, clicking "Brands" left the previous page frozen for the length of that fetch. `app/brands/loading.tsx`
  gives Next a route-segment fallback it can paint instantly on navigation (header + `BrandGridSkeleton`)
  while `page.tsx` runs — same as every other data-backed route in the app.
- **The client query is gated on `isAuthResolved`.** `GET /brands` uses `optionalAuth`: a request
  sent before the access token is restored returns `200` with `isFollowing: false` for every brand
  (no `401`, so the API client never retries it), and `staleTime` then pins that logged-out snapshot.
  Holding the query until auth resolves — plus the token-forwarding SSR prefetch — keeps the very
  first read personalized. Logged-out visitors resolve synchronously, so they don't wait.
- **`BrandCard` holds no `useState` follow flag.** It renders straight from `brand.isFollowing` with
  only a transient optimistic override inside `useOptimisticFollow`; the override is dropped once the
  refetched query (or a prop change) reports the server value. A one-shot `useState(brand.isFollowing)`
  would ignore the corrected data and strand the button on a stale label.
