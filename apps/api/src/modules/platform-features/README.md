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

## HTTP surface

- `GET /api/platform/features/registry` — the static registry.
- `GET /api/platform/features/tenants/:orgId` — the resolved set for one tenant
  (`ResolvedFeature[]`, each with its `source`).
- `PUT /api/platform/features/tenants/:orgId/:key` — upsert an override (`{ enabled, metadata?,
note? }`).
- `DELETE /api/platform/features/tenants/:orgId/:key` — drop the override.

All four are `requirePlatformRole("platform:features:manage")`; the two writes emit a
`platform-audit` row and call `invalidate`.

- `requireFeature(key)` (`platform-features.middleware.ts`) — for tenant routes, stacked after
  `resolveTenant`; reads `res.locals.crmOrganization` and returns `403 FEATURE_NOT_AVAILABLE`
  when off. Wired onto `crm-contacts` (`crm.contacts`) and `crm-pipeline` (`crm.pipeline`) as the
  reference; both keys default on for every plan, so no behavior changes.
- `GET /api/crm/organization` gains a `features: Record<key, boolean>` map (via `featureMap`) so
  the tenant app can hide disabled surfaces without extra calls.

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
- **This registry is per-_tenant_ only.** Every key is something that can legitimately vary from
  one tenant to the next (a CRM surface gate, or the `impersonation.allowed` policy). A global
  product switch — e.g. gamification for the shared storefront — does not belong here; that needs a
  platform-level setting, not a `TenantFeatureOverride`. See [[outfiqe-gamification-toggle-plan]].
