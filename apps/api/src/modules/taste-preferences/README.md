# Taste Preferences

## Purpose

The signed-in visitor's personal choice of which taste categories show on the landing page's
_Explore your taste_ picker, and the reverse view for admins: how popular each category is.

## Structure

- `tastePreference.routes.ts` — `GET /me`, `PUT /me`, `DELETE /me` (all `requireAuth`, mutations
  rate-limited per user), `GET /popularity` (admin).
- `tastePreference.controller.ts` — auth principal → service.
- `tastePreference.service.ts` — `setForUser` de-dupes and treats an empty array as "no
  preference" (deletes the row).
- `tastePreference.repository.ts` — one row per user (`userId` is the PK). `listCategoryPopularity`
  is raw SQL (`unnest` on the array column) — the ORM can't express it.
- `tastePreference.schemas.ts` — Zod for the `PUT` body.
- `tastePreference.types.ts` — `TastePreferenceView`, `CategoryPopularity`.

## Funnel

**User-facing:** an anonymous visitor customizes their picker; it lives in `localStorage`. When
they sign in, the web layer pushes that local choice here once (only if they have no server
record yet — see `apps/web/src/features/categories/README.md`). From then on the choice syncs
across their devices. An admin sees "N shoppers" beside each category on the Categories page.

**Technical:** `tastePreference.routes.ts` → `tastePreference.controller.ts` →
`tastePreference.service.ts` → `tastePreference.repository.ts` → Postgres (`taste_preferences`,
`user_id` FK `ON DELETE CASCADE`).

## Non-obvious rationale

- **No validation of slugs against real categories on write.** The web only ever sends slugs from
  the live list, and the read side (`visibleTasteCategories` in the web) filters stale slugs
  anyway. Adding a lookup per `PUT` would buy nothing — same loose-contract call as
  `POST /categories/reorder`.
- **`PUT []` == `DELETE`.** An empty selection is indistinguishable from "never customized" — both
  mean "fall back to the admin default" — so the service deletes the row rather than storing an
  empty array. Keeps the read model binary (a slug list, or nothing).
- **Popularity is derived, not counted.** There's no separate counter table or event stream; the
  `taste_preferences` rows _are_ the log, and `GET /popularity` aggregates them on read. Fine at
  this scale; revisit if it needs to be real-time or historical.
