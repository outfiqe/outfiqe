# Platform Features

## Purpose

Per-tenant feature resolution: a code registry of feature keys with per-plan defaults, plus one
table of per-tenant overrides. `resolveFeature(org, key)` = override, else plan default, else the
registry default. Platform staff manage the overrides; tenant code calls `isEnabled` to gate a
surface.

## Structure

- `platform-features.registry.ts` — `PLATFORM_FEATURE_KEYS` (a `const` union — a DB registry
  would let typos become data), `PLATFORM_FEATURE_REGISTRY` (key, label, description,
  `registryDefault`, per-plan map), and `planDefaultFor` / `isPlatformFeatureKey`.
- `platform-features.types.ts` — `ResolvedFeature` (`enabled` + `source: "override" | "plan" |
"default"` + `metadata`), the override record shape, and `SetOverrideInput`.
- `platform-features.repository.ts` — `TenantFeatureOverride` CRUD plus a one-column read of the
  organization's `plan`.
- `platform-features.service.ts` — `resolveFeature` / `isEnabled` (5-second in-process cache,
  fail-open to the registry default on any error), `resolveAll` / `featureMap`,
  `invalidate(orgId, key?)` (called after a write), and `assertKey`.
- `platform-features.integration.test.ts`.

The platform CRUD routes, the tenant `requireFeature` middleware, and the `features` map on the
tenant org response are added in the next change.

## Non-obvious rationale

- **Layered, not a flat table.** A flat `(orgId, key, enabled)` row per tenant per feature drifts
  from intent immediately (every new tenant needs N rows; every plan change is a bulk update).
  The plan is the policy layer (in code), the override table is the exception layer, the registry
  default is the safety net.
- **`metadata` on an override** carries numeric limits (seats, caps) so a "feature" and a quota
  share one mechanism.
- **`crm-billing`'s `advancedFeaturesEnabled` is not folded in yet.** The `crm.advanced` key
  exists with matching plan defaults; wiring `requireAdvancedCrmFeatures` to
  `isEnabled(org, "crm.advanced")` is a follow-up so that behavior change lands on its own.
