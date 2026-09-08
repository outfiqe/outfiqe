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

### Images — pipeline output (bigger, second pass)

`@outfiqe/image-pipeline` already produces per-width variants + a base64 LQIP, but public API
types only expose one `imageUrl`. Plumb `variants` + `lqip` through the API for products, looks,
avatars, hero slides and collections, then have `AppImage` take a real `blurDataURL` and (via a
custom `next/image` loader) the pipeline's own variant URLs, removing the self-hosted optimizer
cost.

### Dashboards — extend the prefetch pattern

Same server-prefetch + `HydrationBoundary` as `/overview`, one tab at a time: `products`
(brand), `earnings` (creator — summary query is simple; the ledger is an infinite query, prefetch
with `prefetchInfiniteQuery` or leave client-side), `progress`, `badges`, `challenges`, `wallet`,
`withdraw`, `manage-orders`. Each needs a small server API variant that takes the access token.

### Static rendering — groundwork done, the flip needs a decision + a browser

Every route is dynamic only because the root layout reads `headers()` for the CSP nonce.

Landed: `THEME_INIT_SCRIPT_SHA256` (with a drift test), and `buildContentSecurityPolicy` now
takes `renderMode: "dynamic" | "static"` — `"static"` emits `script-src 'self' 'unsafe-inline'
'wasm-unsafe-eval'` (no nonce, no `strict-dynamic`), and the `"dynamic"` policy also allows the
theme script by hash so it no longer needs the layout's nonce.

Not landed (reverted after testing): removing `await headers()` from the root layout. Doing that
flips ~35 routes to `○` — not just the 8 marketing pages but `/cart`, `/explore`, `/brands`,
`/leaderboard`, `/wishlist`, `/collections`, `/forgot-password`, … because the layout was their
only dynamic input. The problem: those pages were pre-rendered without a nonce, so the strict
`dynamic` CSP the proxy serves them (`nonce` + `strict-dynamic`) would block their inline
flight/bootstrap scripts. The proxy would have to serve the `"static"` CSP to every statically
rendered path, which drops most of the site from a `strict-dynamic` nonce policy to
`'self' 'unsafe-inline'` for scripts — a real, deliberate weakening.

Decision needed: (a) accept `'unsafe-inline'` script CSP for the static pages (they carry no
user/auth data) and keep `strict-dynamic` only on the authenticated app routes, or (b) wire
Next's experimental build-time script hashing (`experimental.sri`) so a nonce CSP works on static
pages, or (c) leave marketing pages dynamic. Whichever — verify on a Vercel preview with
DevTools open (watch the console for CSP violations on `/`, `/help`, `/legal/privacy`, `/shop`,
`/product/[id]`, a dashboard page) before it reaches `dev`.

### Follow-ups noted along the way

- Raise the 120s catalog revalidate window once tag invalidation is trusted in production, or
  leave it as the backstop.
- Restore the "/login when already signed in → dashboard" redirect against the live proxy if
  wanted (it is currently absent).
