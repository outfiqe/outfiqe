# platform-settings

## Purpose

Edit platform-wide limits (items per board, editors per board, photos, offers and so on) within
the range each one allows, or reset one to its default.

## Structure

- `PlatformSettingsPage.tsx` — settings grouped as the API's registry groups them; each row shows
  its description, default and allowed range, a number field, Save, and Reset when changed.
  Values outside the range, or not whole numbers, are refused before saving; rules between
  settings (for example, photos per person can't exceed photos per board) are checked by the API
  and shown as the error it returns.
- `api.ts`, `schemas.ts` — `GET /api/platform/settings`, `PUT` / `DELETE /api/platform/settings/:key`.

Route: `_authenticated.platform.settings.index.tsx` (`/platform/settings`). The "Limits" sidebar
item is in `PLATFORM_NAV_ITEMS`. Needs `platform:settings:manage`.

## Funnel

**User-facing:** open Limits (under the Platform Settings group), change a number, save; or reset
it. Changes are audited and apply within a minute.

## Non-obvious rationale

- **The page is called "Limits", but the code says `platform-settings`.** It used to be called
  "Platform settings", the same as its sidebar group, which was confusing. Only the visible
  label changed. The route, the nav key `platform-settings` and the API stay the same, so
  bookmarks and saved Navigation access choices keep working.

**Technical:** page → `platformSettingsApi` → `/api/platform/settings…` →
`apps/api/src/modules/platform-settings`.
