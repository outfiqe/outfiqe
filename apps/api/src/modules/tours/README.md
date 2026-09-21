# Tours

## Purpose

Remembers, per signed-in user, how each guided product tour ended — finished or skipped — and for which version of that tour. The web app reads this to decide whether to start a tour automatically, so a person who has already seen a tour is never shown it again on another device, browser, or the installed app.

## Structure

- `tour.routes.ts` — `GET /api/tours/me` and `PUT /api/tours/me/:tourKey`, both behind `requireAuth`. The `PUT` also has a per-user rate limit (`tours-mutation`, 30 a minute) and `validate` on the path and body.
- `tour.controller.ts` — reads the signed-in user and validated input, calls the service, sends the standard `{ success, message, data }` envelope.
- `tour.service.ts` — lists a user's progress and records an outcome.
- `tour.repository.ts` — Prisma reads/writes on `user_tour_progress`.
- `tour.schemas.ts` — Zod: `tourKey` must be one of `KNOWN_TOUR_KEYS`, `version` is a whole number from 1 to 1000, `outcome` is `COMPLETED` or `DISMISSED`.
- `tour.types.ts` — the response shapes.
- `tour.constants.ts` — `KNOWN_TOUR_KEYS`, the tour keys this API accepts, checked against `TourKey` from `@outfiqe/types`.
- `tour.utils.ts` — the `isKnownTourKey` guard.

## Funnel

**User-facing:** a brand owner signs in and lands on `/overview`. The first time, the tour opens by itself. Whether they click through to the end or skip it, it doesn't open by itself again — on any device. They can replay it any time from "Take the tour".

**Technical:** `apps/web` `features/product-tour` → `GET /api/tours/me` → `tourController.listMine` → `tourService.listForUser` → `tourRepository.findForUser` → `user_tour_progress`. When the tour ends: `PUT /api/tours/me/brand-dashboard` `{ version, outcome }` → `tourController.recordMine` → `tourService.recordOutcome` → `tourRepository.upsertForUser` (upsert on the `(user_id, tour_key)` unique key).

## Non-obvious rationale

- **Tour keys and outcomes are listed here as plain values, not imported from `@outfiqe/types`.** That package is types-only: it is loaded as CommonJS at runtime, so a named value import from it fails when the API process starts, even though it type-checks and passes under Vitest. The API imports only its types and lists the values itself, checked with `satisfies TourKey[]` / `satisfies TourOutcome[]`, the same way `category.schemas.ts` and `collection.schemas.ts` do. `satisfies` catches a value that is not a real key or outcome, but not a newly added key that is missing here, so a new tour key is added in `@outfiqe/types` and in `tour.constants.ts`.
- **The version lives in the web app, not here.** Each tour's current version is a constant next to its steps in the web app. The API only stores the version the user last saw. When the dashboard changes enough to need a new walkthrough, bumping that constant makes the tour open again for everyone whose stored version is lower — no migration or backfill needed.
- **One row per user per tour, enforced by the database.** The `(user_id, tour_key)` unique index plus an upsert means two saves arriving at the same moment (a double click, two tabs) can't create two rows.
- **No pagination on `GET /me`.** A user has at most one row per tour key, and tour keys are a short fixed list in `@outfiqe/types`, so the response is always small.
- **`tour_key` is plain text, not a database enum.** Adding a tour then needs only a new `TourKey` value, not a migration. Validation happens at the API edge instead, and reads skip any stored key that is no longer declared, so retiring a tour can't break the response.
- **Any signed-in role can save progress.** The tour a user sees is decided by the web app. Storing the outcome of a tour someone was never shown is harmless, and role checks here would only add coupling.
