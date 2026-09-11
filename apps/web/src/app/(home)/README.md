# Home route (`/`)

## Purpose

The public landing page. It is composed of independent sections (highlights carousel, taste
explorer, trending, collections, creator looks, new arrivals, brand callout). Each data-driven
section renders in its own [parallel route](https://nextjs.org/docs/app/building-your-application/routing/parallel-routes)
slot so that a render failure in one section shows a small inline "try again" card for that
section only, while every other section — and the header, footer and nav — keep working.

## Structure

- `layout.tsx` — the page shell. Renders `SiteHeader`, `<main>`, the static `BrandCallout`,
  `SiteFooter` and `MobileTabBar`, and drops each slot into `<main>` in visual order. It does no
  data fetching, so the shell paints immediately and each slot streams in on its own.
- `page.tsx` — the `children` slot. Holds only the page `metadata`; renders nothing.
- `default.tsx` — `children` fallback for soft-navigation states; renders nothing.
- `@hero`, `@trending`, `@collections`, `@creatorLooks`, `@newArrivals` — one slot per section.
  Each has `page.tsx` (renders the section component from `@/features/landing` or
  `@/features/collections`), `loading.tsx` (the streamed skeleton), `error.tsx` (the per-section
  error boundary, delegating to `@/components/HomeSectionError`), and `default.tsx` (re-exports
  `page.tsx`).
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
- `HomeSectionError` lives in `@/components` (not here) because it is a reusable presentational
  component, not route glue.

## Funnel

User-facing: a visitor opens `/`, sees the header and section skeletons instantly, then each
section fills in as its data resolves. If one section errors, that section shows a bordered
"… didn't load / try again" card and the rest of the page is unaffected; pressing "try again"
re-renders just that slot.

Technical: `layout.tsx` renders the shell and the six slot props → each `@slot/page.tsx` renders
its `@/features/*` section (an async server component that fetches directly, except `@taste`
which prefetches into React Query and hydrates its client components) → Next.js wraps each slot
in its own Suspense (`loading.tsx`) and error boundary (`error.tsx`).

## Non-obvious rationale

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
