# Platform Features (apps/admin)

## Purpose

The platform-admin screen for per-tenant feature overrides. Pick a tenant, see every feature with
its resolved state and where that state comes from (override / plan default / registry default),
flip an override, or clear one. In the sidebar's Platform section (needs `platform:access`).

## Structure

- `schemas.ts` — Zod mirrors of the registry entry and `ResolvedFeature`.
- `api.ts` — `platformFeaturesApi` (`getRegistry`, `getTenantFeatures`, `setOverride`,
  `clearOverride`).
- `PlatformFeaturesPage.tsx` — a tenant `<Select>` (reusing `platformMetricsApi.listTenants`) and
  a table of resolved features with an enable/disable button and, when the state is an override,
  a "Clear override" button.
- `PlatformFeaturesPage.integration.test.tsx`.

Route: `_authenticated.platform.features.index.tsx` (`/platform/features`); the "Feature flags"
sidebar item is in `PLATFORM_NAV_ITEMS`.

## Non-obvious rationale

- **`setOverride` always writes an explicit `enabled`**, even when flipping to the plan default's
  value — the point of the button is to pin the state. "Clear override" is the only way back to
  following the plan.
