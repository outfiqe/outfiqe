# outfits

## Purpose

Outfit Build: people put one complete outfit together on a shared board, alone or with up to
five editors, lock it, and choose who can see it. So far this module holds the data model and
its database rules; the board's API, live updates and the rest of the feature are added on top
in later steps (see `docs/PLAN-OUTFIT-BUILD.md`). Everything stays behind the `outfit_builder`
feature flag.

## Structure

- `outfit.constraints.integration.test.ts` — proves the database rules below hold even if
  application code gets something wrong.

The tables (`apps/api/prisma/schema.prisma`, migration `20260929200000_add_outfit_build_data_model`):

| Table              | Holds                                                                                                                                                                                                                                                                                                     |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `outfits`          | Status (draft, locked, archived), who can see it (private, shared, public), the version number every change bumps, title, budget in whole rupees, the owner's per-person item limit, the chat it was started from, its own group chat, and the version shared or public viewers see (`published_version`) |
| `outfit_members`   | The owner and editors, each with an "I'm happy" flag                                                                                                                                                                                                                                                      |
| `outfit_shares`    | The people a Shared build was sent to                                                                                                                                                                                                                                                                     |
| `outfit_slots`     | The build's own copy of the slot types, taken when it was created                                                                                                                                                                                                                                         |
| `outfit_items`     | The product in each slot position and who added it                                                                                                                                                                                                                                                        |
| `outfit_photos`    | Cover and try-on photos, linked to the image pipeline's asset                                                                                                                                                                                                                                             |
| `outfit_events`    | One history row per version, used to catch up after a dropped connection                                                                                                                                                                                                                                  |
| `outfit_snapshots` | The items, prices, total and contributors saved at each lock                                                                                                                                                                                                                                              |

`creator_looks.source_outfit_id` / `source_outfit_version` link a Creator Look back to the build
version it was published from, `messages.outfit_id` (kind `OUTFIT_CARD`) carries a build card in a
chat, and `commission_tiers.scope` separates Build commission tiers from Creator Look ones.

## Funnel

**User-facing**: not reachable yet. The feature flag is off and there are no routes.

**Technical**: the tables are written only through Prisma in later steps; admin slot types come
from `modules/outfit-slot-types`.

## Non-obvious rationale

- **Viewers aren't member rows.** Only the owner and editors are members. A viewer is worked out:
  someone the build was shared with (`outfit_shares`), someone in the chat it was started from, or
  anyone once it's public. A row per public viewer isn't possible, and keeping members to the
  people who can edit makes "at most five editors" a simple count.
- **The owner is a member role, not a column.** A partial unique index
  (`outfit_members_one_owner_per_outfit_idx`) allows exactly one `OWNER` row per build, so there
  is no second copy of "who owns this" to keep in step.
- **An item can only sit in its own build's slot.** `outfit_items` points at its slot with the
  pair (`outfit_slot_id`, `outfit_id`), which must match an `outfit_slots` row with the same pair,
  so an item can never reference another build's slot.
- **The same product can't be on one board twice**, and a slot position holds one item
  (`outfit_items` unique keys). Positions can't be negative; whether a position fits inside its
  slot is checked in code with the shared rules in `@outfiqe/utils` (`findPlacementRefusal`),
  because a CHECK constraint can't read another table.
- **Products on a board can't be hard-deleted** (`ON DELETE RESTRICT`). Products are only ever
  soft-deleted today; the restriction keeps a board's history and later commission splits intact
  if that ever changes.
- **Other database rules**: version, positions and snapshot totals are never negative, the budget
  is never negative, the per-person limit is 1–3 when set, and a slot holds at least one item.
- **Publishing a build version as a look happens once per creator**, enforced by the unique key
  (`creator_id`, `source_outfit_id`, `source_outfit_version`) on `creator_looks`. Looks with no
  source build are unaffected because Postgres treats the empty values as distinct.
- **Snapshots save the contributors.** Build commission is split among everyone on the build when
  it was published, so each lock records the contributor ids alongside the prices.
