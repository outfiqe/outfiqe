# categories

## Purpose

Client access to the taste categories, plus the per-visitor customization of which ones show on
the landing page's _Explore your taste_ picker.

## Structure

- `api/categoriesApi.ts` + `api/categorySchemas.ts` — `GET /categories` client and the
  `PublicCategory` schema.
- `api/getCategoriesServer.ts` — the same fetch for server components (returns `[]` on failure).
- `hooks/useCategories.ts` — React Query wrapper, 10-minute stale time.
- `hooks/useTastePreferences.ts` — the visitor's stored pick, as an ordered slug array in
  `localStorage["outfiqe:taste-categories"]`. `useSyncExternalStore` so it has a real SSR snapshot
  (`null` → admin default) and updates across tabs / after a save. Returns `{ storedSlugs,
isCustomized, save, reset }`.
- `lib/visibleTasteCategories.ts` — pure: given the full list and the stored slugs, returns the
  categories to render (stored order, stale slugs dropped, falls back to the first
  `LANDING_TASTE_CATEGORY_COUNT` when nothing valid is stored).

## Funnel

**User-facing:** a first-time visitor sees the first six categories (admin order). A returning
visitor who has customized sees their set, in their order. A `+ Customize` tile opens
`CustomizeTasteModal` (`features/landing/components/TasteCategories/`) — add / remove / reorder the
full list, or _Reset to default_. The choice is per-device.

**Technical:** `TasteCategories` → `useCategories` (full list) + `useTastePreferences` (stored
slugs) → `visibleTasteCategories` → rendered tiles. `CustomizeTasteModal` edits a draft slug array
and calls `save()` on confirm.

## Non-obvious rationale

- **Only `useTastePreferences` touches `localStorage`.** Components read the resolved list, never
  the raw key — so swapping the backing store for a per-user server record later is a one-file
  change.
- **`visibleTasteCategories` re-filters stale slugs on every call.** An unpublished or deleted
  category silently drops out of a visitor's saved set; an all-stale set falls back to the admin
  default rather than rendering nothing.
- **A `?category=<slug>` deep link is always honoured** even when that category isn't in the
  visitor's set — `TasteCategories` prepends its tile so the selected category is visible.
