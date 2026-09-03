# categories

## Purpose

Client access to the taste categories, plus the per-visitor customization of which ones show on
the landing page's _Explore your taste_ picker.

## Structure

- `api/categoriesApi.ts` + `api/categorySchemas.ts` — `GET /categories` client and the
  `PublicCategory` schema.
- `api/getCategoriesServer.ts` — the same fetch for server components (returns `[]` on failure).
- `api/tastePreferencesApi.ts` — `GET/PUT/DELETE /taste-preferences/me` for the signed-in
  visitor's server-stored pick.
- `hooks/useCategories.ts` — React Query wrapper, 10-minute stale time.
- `hooks/useTastePreferences.ts` — the visitor's stored pick as an ordered slug array. Anonymous:
  `localStorage["outfiqe:taste-categories"]` only (`useSyncExternalStore`, real SSR snapshot,
  cross-tab). Signed in: the server record is the source of truth (React Query), localStorage is
  kept as a mirror, and a local-only choice is pushed up once on first sign-in (only when no server
  record exists yet). Returns `{ storedSlugs, isCustomized, save, reset }` either way.
- `lib/visibleTasteCategories.ts` — pure: given the full list and the stored slugs, returns the
  categories to render (stored order, stale slugs dropped, falls back to the first
  `LANDING_TASTE_CATEGORY_COUNT` when nothing valid is stored).

## Funnel

**User-facing:** a first-time visitor sees the first six categories (admin order). A returning
visitor who has customized sees their set, in their order. A `+ Customize` tile opens
`CustomizeTasteModal` (`features/landing/components/TasteCategories/`) — add / remove / reorder the
full list, or _Reset to default_. Signed out, the choice is per-device. Signed in, it follows the
account across devices, and a choice made while signed out is carried up to the account once on the
next sign-in (only if the account has no saved set yet).

**Technical:** `TasteCategories` → `useCategories` (full list) + `useTastePreferences` (stored
slugs) → `visibleTasteCategories` → rendered tiles. `CustomizeTasteModal` edits a draft slug array
and calls `save()` on confirm. `useTastePreferences` writes `localStorage` for everyone and, when
signed in, also `PUT`s `/taste-preferences/me`; that endpoint's aggregate feeds the "N shoppers
pinned this" counts on the admin Categories page.

## Non-obvious rationale

- **Only `useTastePreferences` knows where the pick is stored.** Components read the resolved list,
  never `localStorage` or the API directly — so the anonymous-vs-signed-in split, the server sync,
  and the first-sign-in merge all stay inside that one hook.
- **The first-sign-in merge is one-directional and one-shot.** A local set is pushed to the server
  only when the account has no record yet; once the server has a set it wins, and a stale
  localStorage mirror is never sent back up. This keeps a shared computer from overwriting an
  account's real choice.
- **`visibleTasteCategories` re-filters stale slugs on every call.** An unpublished or deleted
  category silently drops out of a visitor's saved set; an all-stale set falls back to the admin
  default rather than rendering nothing.
- **A `?category=<slug>` deep link is always honoured** even when that category isn't in the
  visitor's set — `TasteCategories` prepends its tile so the selected category is visible.
