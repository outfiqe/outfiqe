# platform-switches

## Purpose

Turn platform-wide features (Outfit Build, build photos, try-on photos, the public builds feed)
off, on for a list of people and brands, or on for everyone. These are platform switches, not the
per-tenant feature flags in `../platform-features`.

## Structure

- `PlatformSwitchesPage.tsx` — one card per switch: who has it, and when it's "on for the people
  and brands listed", an "Add a person" search (`@/components/UserSearchField`) and an "Add a brand"
  search (`@/components/BrandSearchField`). Each pick is added once to the list below its search.
- `AllowListChips.tsx` — the people or brands on a list as chips (name, and @handle for people),
  each with a remove button, or an empty message when nobody is on it.
- `api.ts`, `schemas.ts` — `GET /api/platform/feature-flags`, `PUT /api/platform/feature-flags/:key`.

Route: `_authenticated.platform.switches.index.tsx` (`/platform/switches`). The "Feature switches"
sidebar item is in `PLATFORM_NAV_ITEMS`. Needs `platform:flags:manage`.

## Funnel

**User-facing:** open Feature switches, choose "On for the people and brands listed", search for
people by name or @handle and brands by name, pick them, remove anyone who shouldn't be there, save.
The change is audited and reaches the apps within a few seconds.

**Technical:** page → `featureSwitchesApi` → `/api/platform/feature-flags…` →
`apps/api/src/modules/feature-flags`. The searches call `GET /api/users/search` (`usersApi`) and
`GET /api/brands` (`brandsApi`).

## Non-obvious rationale

- **The list shows names, but saves ids.** `GET /api/platform/feature-flags` returns `allowedUsers`
  and `allowedBrands` (id, name, and handle for people) next to the raw id lists, and the card edits
  those. Saving sends only the ids.
- **An account or brand that no longer exists drops off the list.** The API only returns the ids it
  can still find, so the next save leaves them out. Otherwise the save would be refused, because the
  API rejects allow-list ids that don't exist.
- **`platform:flags:manage` can use the user search.** It is one of the keys the API's `userSearch`
  guard accepts, so someone who only manages switches can still find people to add.
