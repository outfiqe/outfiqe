# platform-switches

## Purpose

Turn platform-wide features (Outfit Build, build photos, try-on photos, the public builds feed)
off, on for a list of people and brands, or on for everyone. These are platform switches, not the
per-tenant feature flags in `../platform-features`.

## Structure

- `PlatformSwitchesPage.tsx` — one card per switch: who has it, and when it's "on for the people
  and brands listed", the person and brand IDs (one per line, checked to be IDs before saving).
- `api.ts`, `schemas.ts` — `GET /api/platform/feature-flags`, `PUT /api/platform/feature-flags/:key`.

Route: `_authenticated.platform.switches.index.tsx` (`/platform/switches`). The "Feature switches"
sidebar item is in `PLATFORM_NAV_ITEMS`. Needs `platform:flags:manage`.

## Funnel

**User-facing:** open Feature switches, pick who has a feature, save. The change is audited and
reaches the apps within a few seconds.

**Technical:** page → `featureSwitchesApi` → `/api/platform/feature-flags…` →
`apps/api/src/modules/feature-flags`.
