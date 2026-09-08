# Web rendering, caching and images

Work on branch `perf/web-rendering-caching-images`. Each bullet below is one commit; the branch
is not merged. New production env var: `WEB_REVALIDATE_SECRET` (same value in `apps/api` and
`apps/web`) — until it is set, catalog edits fall back to a 120s window and nothing breaks.

## Done

### Navigation feel

- `experimental.staleTimes` (`dynamic: 30`, `static: 180`) so the client router reuses a visited
  page's payload instead of re-rendering and replaying `loading.tsx` on every back/forward.
- `getServerSessionWithToken` wrapped in React `cache()` — the profile page went from four auth
  round-trips per load to two.
- React Query `gcTime` raised to 30 minutes so returning to a dashboard tab shows its last data
  with a background refresh instead of a cold skeleton.

### Caching

- Removed the dead `apps/web/src/proxy.ts` (Next runs `apps/web/proxy.ts`; the auth-gate file
  never executed). Route protection is unchanged — `requireDashboardSession` is the real guard.
  The "signed-in user visiting /login goes to their dashboard" redirect it intended is gone and
  was already gone in production; restoring it against the live proxy is a separate change.
- `serverApiRequest` takes optional `revalidateSeconds` + `cacheTags` (default is still
  `no-store`); categories, product types, hero slides and homepage collections now use a 120s
  window plus a cache tag. It refuses to cache a request carrying a cookie or access token.
- `POST /internal/revalidate` (web) — bearer `REVALIDATE_SECRET`, tags checked against the shared
  allowlist, `revalidateTag(tag, { expire: 0 })`. `apps/api` calls it after a successful write to
  categories / product types / hero slides / collections, so an admin edit shows up immediately.
  A missing secret or a failed call is a no-op / logged, never a failed admin write.

### Dashboards

- Non-critical providers (install / push / update prompts, PWA housekeeping, chat launcher and
  panel) wrapped in `DeferredMount`, which reveals them on the first `requestIdleCallback`.
- `/overview` prefetches the brand or creator overview on the server and hydrates it, so the tab
  paints once with data instead of `loading.tsx` then an in-component skeleton.

### Images

- `next.config` `images`: avif/webp, `remotePatterns` from `API_URL` / `API_PUBLIC_URL` /
  `NEXT_PUBLIC_SOCKET_URL` / `NEXT_PUBLIC_IMAGE_HOSTS`.
- `AppImage` (`apps/web/src/shared/components`) — `next/image` wrapper: lazy by default, `eager`
  maps to `priority`, `object-cover` with `fill`. Web-local because the design system is
  framework-agnostic (admin is Vite) and must not depend on `next`.
- Converted: `ProductCard`, `LookCard`, `BrandCard` (banner + avatar), `CollectionCard`.

## Remaining

### Images — convert the rest from `background-image` to `AppImage`

Do highest-traffic first, check the visual result, then sweep the long tail.

- **Above the fold / LCP:** `HeroCarousel` — deliberately skipped so far; it needs the gradient
  overlay split into its own layer, content moved to a `relative z-10` wrapper, and `priority`
  on slide 0 only. Do this one with eyes on a running app.
- **High traffic:** `product-detail/ProductDetail`, `product-detail/SeenOnCreators`,
  `creator-profile/CreatorProfile`, `creator-profile/CreatorPostThumbnail`,
  `brand-profile/BrandProfile`, `explore/PostCarousel`, `explore/PostGridCard`,
  `collections/CollectionDetail`, `cart/CartItemRow`, `orders/OrderRow`.
- **Dashboard / rails:** `brand-dashboard/ProductsSection`, `brand-dashboard/BrandOrderRow`,
  `brand-dashboard/BrandProfileView`, `creator-dashboard/ChallengeCard`,
  `creator-dashboard/EarningsLedgerRow`, `creator-dashboard/EditPostForm`,
  `creator-dashboard/ProductTagPicker`, `creator-dashboard/ShareProductPicker`,
  `creator-leaderboard/*`, `leaderboard/*`, `product-reviews/ReviewCard`.
- **Small avatars / chrome:** `components/AccountMenu`, `components/DashboardSidebar`,
  `components/MobileNav`, `messaging/ConversationList`, `messaging/MessageThread`,
  `search/*` result rows, `chat-settings/ChatAvailabilitySettings`,
  `explore/PostCommentsSection`, `landing/TasteCategories`, `shared/PendingPhotoThumbnailRail`,
  `shared/PhotoCropPane` (crop UI — may be fine to leave as `background-image`).

### Images — pipeline output (in progress on `feat/image-pipeline-integration`)

`@outfiqe/image-pipeline` produces per-width variants (avif/webp/jpeg) plus a base64 LQIP. Done so
far:

- `ProductImage` / `CreatorLookImage` link to an `ImageProcessingAsset` (`imageAssetId`, nullable
  FK, `onDelete: SetNull`). Public product and creator-look responses carry `image`
  (`{ url, lqip, sources: [{ format, srcSet }] }`) next to the unchanged `imageUrl`;
  `image.url === imageUrl` always. See `apps/api/src/modules/{products,creator-looks,image-processing}/README.md`.
- `POST /uploads/pipeline` runs a domain photo through the pipeline; product / look create+update
  take `imageAssetIds` and persist the link. The web product and look forms upload through it.
- `AppImage` renders a `<picture>` (avif + webp `<source>` from the pipeline's own URLs, jpeg
  `<img>` fallback, LQIP as the backdrop) when it gets an `image` with `sources`; otherwise it
  stays on `next/image`, adding `placeholder="blur"` when an `lqip` is present. This bypasses the
  self-hosted optimizer for processed images. `ProductCard`, `ProductDetail` (main image),
  `LookCard`, `PostGridCard`, `CreatorPostThumbnail` pass `image` through.

Hero slides and collections got the same treatment: `imageAssetId` FK, `image` on the public
response, admin `ImageUpload` uploads through `/uploads/pipeline`, and `HeroCarousel` /
`CollectionCard` / `CollectionDetail` consume `image`. `prisma/backfill-image-assets.ts`
(`pnpm db:backfill:image-assets`) links existing product/look gallery rows — run it once per
environment after deploy.

Not done: the same treatment for avatars, brand banners (schema column exists, no code yet),
`ProductReviewImage`, `PostCarousel`, `SeenOnCreators`, and cart/order line-item thumbnails; a
backfill for hero slides / collections.

### Dashboards — extend the prefetch pattern

Same server-prefetch + `HydrationBoundary` as `/overview`, one tab at a time: `products`
(brand), `earnings` (creator — summary query is simple; the ledger is an infinite query, prefetch
with `prefetchInfiniteQuery` or leave client-side), `progress`, `badges`, `challenges`, `wallet`,
`withdraw`, `manage-orders`. Each needs a small server API variant that takes the access token.

### Static rendering — done (#261)

Option (a) shipped, plus a fix nobody was looking for.

- The root layout no longer reads `headers()`. `THEME_INIT_SCRIPT` and its hash moved to a
  directive-free `theme-init.ts`; the theme script is allowed by CSP hash on dynamic pages and by
  `'unsafe-inline'` on static ones.
- **The proxy was never running.** Next resolves the proxy from `src/` for a `src/` app, but the
  file was at `apps/web/proxy.ts`, so production served **no CSP at all** (`curl -sI
https://outfiqe.com/` had none of the middleware headers). Moved to `apps/web/src/proxy.ts`,
  which activates it.
- Two policies by route: `nonce` + `strict-dynamic` for per-user / server-rendered-UGC routes,
  `'self' 'unsafe-inline'` for the static and client-only shells.
- `export const dynamic` on the handful of routes that must keep the strict policy but would
  otherwise prerender (checkout, apply, verify-email, forgot-password, oauth-callback,
  support/reopen, the dashboard/orders shells).
- `experimental.sri` adds `integrity` to script tags.

`/about`, `/contact`, `/help`, `/how-it-works`, `/size-guide`, `/for-brands`, `/for-creators`,
`/legal/*` and the public browse shells (`/explore`, `/brands`, `/collections`, `/leaderboard`,
`/cart`, `/wishlist`, `/search`) are now prerendered + `Cache-Control: s-maxage=31536000`.

CI Browser tests + Lighthouse passed with the CSP active. Still smoke-test the Vercel preview
(DevTools console on `/`, `/shop`, `/product/[id]`, `/checkout`, a dashboard page) before
`dev` → `main`, since this is the first time prod has a CSP. If anything is blocked, reverting
just the `src/proxy.ts` move restores the current no-CSP behaviour and keeps the static win.

### Follow-ups noted along the way

- Raise the 120s catalog revalidate window once tag invalidation is trusted in production, or
  leave it as the backstop.
- Restore the "/login when already signed in → dashboard" redirect against the live proxy if
  wanted (it is currently absent).
