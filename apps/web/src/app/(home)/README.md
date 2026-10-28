# Home route (`/`)

## Purpose

The public landing page. It is composed of independent sections (highlights carousel, taste
explorer, trending, sale, collections, creator looks, new arrivals, brand callout). Each data-driven
section renders in its own [parallel route](https://nextjs.org/docs/app/building-your-application/routing/parallel-routes)
slot so that a render failure in one section shows a small inline "try again" card for that
section only, while every other section — and the header, footer and nav — keep working.

## Structure

- `layout.tsx` — the page shell. Renders `SiteHeader`, `<main>`, the static `BrandCallout`,
  `SiteFooter` and `MobileTabBar`, and drops each slot into `<main>` in visual order. It does no
  data fetching, so the shell paints immediately and each slot streams in on its own.
- `page.tsx` — the `children` slot. Holds only the page `metadata` (from `homePageMetadata.ts`);
  renders nothing.
- `guest-home/page.tsx` — the same homepage, prerendered for visitors with nothing to personalise
  (`dynamic = "force-static"`, `revalidate = 300`). `proxy.ts` rewrites those visits to it; the URL
  stays `/`. It uses the same `homePageMetadata`, so its canonical URL is `/`.
- `homePageMetadata.ts` — the title, description and canonical path both pages share.
- `default.tsx` — `children` fallback for soft-navigation states; renders nothing.
- `@hero`, `@trending`, `@sale`, `@collections`, `@creatorLooks`, `@newArrivals` — one slot per
  section. Each has `page.tsx` (renders the section component from `@/features/landing` or
  `@/features/collections`), `loading.tsx` (the streamed skeleton), `error.tsx` (the per-section
  error boundary, delegating to `@/components/HomeSectionError`), and `default.tsx` (re-exports
  `page.tsx`). `@sale` is the one slot that can legitimately render nothing (`SaleRail` returns
  `null` when no product currently has an active discount) — see `landing/components/SaleRail`'s
  own rationale for why that's a `null` return rather than an empty-state message like its
  siblings.
- `@taste` — the taste explorer + category results. These two components share
  `CategorySelectionContext` and a single React Query `HydrationBoundary`, so they live in one
  slot. `TasteResultsSlot.tsx` resolves the visitor's stored taste pick server-side — the
  `outfiqe_taste_categories` cookie, plus the DB record for a signed-in visitor
  (`getTastePreferencesServer`, which wins) — then derives the visible categories and the active
  category from it (`resolveDisplayCategories` / `resolveActiveCategorySlug`, the same helpers the
  client components use) before prefetching `categories`, `product-types` and the first page of
  `products` for that category. It seeds the resolved pick into `CategorySelectionProvider`
  (`serverResolvedTasteSlugs`) and, when signed in, into the `taste-preferences` query cache.
  `page.tsx` reads `?category` / `?type` from `searchParams` and passes them in; `default.tsx`
  renders the slot with no params for soft-navigation states where `searchParams` is unavailable.
  Picking a taste smooth-scrolls the results section (`id="taste-results"`, `scrollToTasteResults`) to
  the top of the viewport, honoring `prefers-reduced-motion`, so the visitor sees that the grid
  below changed — on a phone the results start below the fold and the swap is otherwise invisible.
- `HomeSectionError` lives in `@/components` (not here) because it is a reusable presentational
  component, not route glue.

## Funnel

User-facing: a visitor opens `/`, sees the header and section skeletons instantly, then each
section fills in as its data resolves. If one section errors, that section shows a bordered
"… didn't load / try again" card and the rest of the page is unaffected; pressing "try again"
re-renders just that slot.

Technical: `proxy.ts` asks `shouldServeGuestHome` (`@/features/landing`) whether the request is a
plain `GET`/`HEAD` of `/` with no query string, no `refresh_token` cookie and no taste cookie. If so
it rewrites to `/guest-home`, served from Vercel's cache with the static CSP; otherwise `/` renders
live with the nonce CSP. Either way, `layout.tsx` renders the shell and the seven slot props
(`/guest-home` matches no slot sub-route, so every slot renders its `default.tsx`, which is the
same section) → each `@slot/page.tsx` renders
its `@/features/*` section (an async server component that fetches directly, except `@taste`
which prefetches into React Query and hydrates its client components) → Next.js wraps each slot
in its own Suspense (`loading.tsx`) and error boundary (`error.tsx`).

## Non-obvious rationale

- **Why a cached copy for visitors with nothing to personalise:** the live homepage renders on
  every request (it reads cookies and carries a per-request CSP nonce), so anything that loads it
  without cookies — crawlers, link previews, uptime checks, first-time visitors — paid for a full
  server render each time. One uptime check hitting `/` once a minute used up the Vercel plan's
  whole monthly Active CPU allowance. Those visitors all see the same page, so `/guest-home` is
  rendered at most once per 5 minutes and served from the CDN in between. Anyone with a session or
  a taste pick, or a `?category=`/`?type=` deep link, still gets the live, personalised render.
- **Why `force-static` is safe here:** under `force-static`, Next makes `cookies()` and
  `searchParams` return empty, so the slots render the anonymous view (`getServerAccessToken`
  finds no session, the taste slot finds no cookie) and nothing per-user can end up in the cached
  copy. Uncached product-rail fetches are refetched on each 5-minute rebuild instead of turning
  the page dynamic.
- **Why the cached copy uses the static CSP:** a cached page can't carry a per-request nonce. It
  gets the same `'self' 'unsafe-inline'` policy as the other prerendered pages (`/cart`,
  `/search`, …). React escapes the creator-look text the page shows, and signed-in visitors still
  get the strict nonce policy.
- **Freshness:** `revalidate = 300` matches `SHARED_CONTENT_REVALIDATE_SECONDS`. The page's
  rebuild window is the shortest window of any cached fetch on it, so that constant has to stay
  at or above it. Admin edits to categories, product types, hero slides and collections still show
  at once through `/internal/revalidate`. Product rails (prices, stock) can be up to 5 minutes
  old for logged-out visitors; the product page, cart and checkout always read live.
- **The language still follows the visitor:** translations are chosen in the browser
  (`ClientTranslationsProvider` reads `NEXT_LOCALE`), so a cached copy shows each visitor their
  own language and the language cookie doesn't need to force a live render.

- **Why parallel routes rather than a shared `<Suspense>` per section (the previous shape):**
  a `<Suspense>` boundary isolates _loading_ but not _errors_ — a throw inside a suspended
  section bubbled past it to the route-level `app/error.tsx` and replaced the whole page. A
  parallel route slot gets an independent error boundary from `error.tsx`, which is what
  contains a section failure to that section.
- **What this does and does not catch:** the section fetch helpers in `@/features/*`
  (`getTrendingProductsServer`, `getHomepageCollectionsServer`, `getHeroSlidesServer`, …)
  already `try/catch` and return `[]` / `null`, so an API outage renders a section's empty
  state, not an error card. The per-slot `error.tsx` covers render-time failures in a section
  subtree (bad data shape, a component throw) and any future section that fetches without that
  fail-soft wrapper.
- **Why there is no route-level `loading.tsx`:** the shell moved into `layout.tsx`, so a
  full-page `loading.tsx` would double-render the header and footer inside the `children` slot.
  The old full-page skeleton is split across the per-slot `loading.tsx` files instead.
- **Why `@taste` keeps the only `HydrationBoundary`:** the dehydrated `categories` /
  `product-types` / `products` queries are consumed only by `TasteCategories` and
  `CategoryResults`. `SiteHeader`, `MobileNav` and `MobileTabBar` do not read them, so nothing
  in the shell regresses by scoping the boundary to this slot.
- **Why the taste pick is resolved server-side (and mirrored to a cookie):** the picker's
  content depends on a per-visitor preference. That preference lives in `localStorage` for an
  anonymous visitor, which the server cannot read — so without help the server rendered the
  default first-six categories and the client corrected it after hydration, a visible flash of
  the wrong section. `useTastePreferences` now also writes the pick to the
  `outfiqe_taste_categories` cookie (`SameSite=Lax`, a plain display preference — no `httpOnly`,
  no CSRF surface), which SSR reads; a signed-in visitor's DB record is fetched server-side and
  takes precedence. `CategorySelectionProvider` renders the server value on the hydration pass
  (`useIsHydrated` gate) and only switches to the live client value afterward, so a returning
  visitor sees their real set on first paint with no reshuffle.
