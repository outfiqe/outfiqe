# Categories

## Purpose

The taste categories ("Old Money", "Streetwear", …) that power the landing page's _Explore your
taste_ picker and product filtering. Admin-managed: create, image, publish/unpublish, and order.

## Structure

- `category.routes.ts` — `GET /` (public, Redis-cached), `GET /admin` (all statuses, admin),
  `POST /` (create), `POST /reorder`, `PATCH /:id`. Every write refreshes the public cache.
- `category.controller.ts` — validated input + auth principal → service.
- `category.service.ts` — create/update with slug-conflict handling, `reorder` with request
  validation, `listPublic` (maps to `PublicCategory`), plus `getBySlug` / `getManyBySlugs` used by
  other modules (products, attribution).
- `category.repository.ts` — Prisma queries. `reorder` writes `sortOrder` from each id's position
  in one transaction; `listIds` backs the reorder validation.
- `category.schemas.ts` — Zod (`createCategorySchema`, `updateCategorySchema`,
  `reorderCategoriesSchema`).
- `category.utils.ts` — `toPublicCategory` mapper.
- `category.types.ts` — record / view types.

## Funnel

**User-facing (admin):** open Categories, create with a name + slug + image, publish, and reorder
with the up/down arrows. A divider marks where the landing-page cut-off falls.

**User-facing (shopper):** the landing page reads `GET /categories` and shows only the first few
(see `apps/web/src/features/categories/README.md`).

**Technical:** `category.routes.ts` → `category.controller.ts` → `category.service.ts` →
`category.repository.ts` → Postgres. `GET /` is served from Redis (`cache` middleware); a create /
reorder / update runs `refreshCacheOnWrite` so the next public read is warm.

## Non-obvious rationale

- **`GET /` returns the full ordered list, not a landing subset.** The web slices it to the first
  `LANDING_TASTE_CATEGORY_COUNT` (`@outfiqe/utils`) itself, and it needs the whole list anyway for
  the _Customize_ editor. Keeping one cached endpoint is simpler than a second `?scope=landing`
  cache key for a ~2 KB payload.
- **`reorder` does not require a full permutation.** It only rejects duplicate ids and unknown
  ids, then sets `sortOrder = position` for each id sent. The admin always sends every id, so the
  result is a clean `0..n-1`; the looser contract keeps the endpoint testable against a shared
  (non-isolated) integration database.
- **"The default 6" is implicit — it's the top of `sortOrder`.** There is no `landingFeatured`
  flag; the admin curates the shortlist by ordering. If explicit per-set curation is ever needed
  (seasonal sets, segments), that becomes a separate config surface rather than a column here.
