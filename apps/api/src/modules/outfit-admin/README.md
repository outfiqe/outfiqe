# outfit-admin

## Purpose

Platform staff tools for Outfit Build: look up any build, see everything about it and its history,
unlock or archive it when needed, and read the weekly numbers used to judge the feature.

## Structure

- `outfit-admin.routes.ts` — mounted at `/api/platform`:
  - `GET /builds` (search by title or owner name/handle, filter by status and visibility, cursor
    pages), `GET /builds/metrics?weeks=`, `GET /builds/:id`, `GET /builds/:id/history?beforeVersion=`
    — need `platform:builds:read` or `platform:builds:manage`.
  - `POST /builds/:id/unlock`, `POST /builds/:id/archive` with `{ reason }` — need
    `platform:builds:manage`.
- `outfit-admin.controller.ts` — reads validated input, calls the service.
- `outfit-admin.service.ts` — list, detail, history, the two staff actions, and the metrics.
- `outfit-admin.repository.ts` — the list and detail queries (read replica), and the weekly
  metrics in raw SQL.
- `outfit-admin.utils.ts` — row-to-view mappers and the commission-by-rate join.
- `outfit-admin.schemas.ts`, `outfit-admin.types.ts`, `outfit-admin.constants.ts`.
- Tests: `outfit-admin.integration.test.ts`, `outfit-admin.utils.test.ts`.

## Funnel

**User-facing:** a staff member opens Outfit builds in admin, searches for a build, opens it and
sees its people, items, locked versions, what viewers see, looks posted from it, photos, open
reports and history. With the manage permission they can unlock or archive it, giving a reason.
The Metrics tab shows the weekly numbers.

**Technical:** admin `features/outfit-builds` → `/api/platform/builds…` →
`requirePlatformRole` → controller → `outfitAdminService` → `outfitAdminRepository` (reads) or a
transaction through `../outfits/outfit.repository.ts` (writes) → `recordOutfitChange` → outbox →
open boards refresh.

## Non-obvious rationale

- **Staff changes go through the same version, history and outbox as owner changes.** Unlock and
  archive bump the build's version and write an `outfit_events` row (`payload.byStaff = true` and
  the reason) through `recordOutfitChange`, so every open board refreshes and the history shows
  what happened. They don't post a line in the build chat. Each one is also written to the
  platform audit log with the reason.
- **Staff unlock clears everyone's "I'm happy"**, exactly like the owner unlocking, so the build
  has to be agreed again before it can be locked.
- **Metrics weeks start on Monday, Nepal time.** Every weekly count is grouped by
  `weekStartInMetricsZone(column)`, which is
  `date_trunc('week', (column AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kathmandu')`. The list of
  weeks comes from `generate_series`, so a week with no activity still shows as zeros.
- **The `AT TIME ZONE 'UTC'` step is required.** Our timestamp columns are `TIMESTAMP(3)` without a
  time zone, holding UTC. A single `column AT TIME ZONE 'Asia/Kathmandu'` reads that UTC value as if
  it were already Nepal time and shifts it the wrong way, so anything from the first hours of a
  Monday in Nepal landed in the previous week. Converting from UTC first gives the Nepal wall-clock
  time. `now()` has a time zone, so the current week needs only the single conversion.
- **Full set or picked items is worked out from the order, not stored.** An order counts as a
  full-set order for a build version when its lines attributed to that build cover every item in
  that version's snapshot (`order_items.attributed_outfit_*` against
  `jsonb_array_length(outfit_snapshots.items)`).
- **Commission at each rate** counts every commission row that isn't voided, in the period,
  grouped by tier, for both Creator Look and Build tiers.
