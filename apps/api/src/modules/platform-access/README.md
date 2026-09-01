# Platform Access

## Purpose

The authorization layer for Outfiqe's own platform-admin surface (`/api/platform/*`) — the
super-admin tooling that manages tenants, sits beside the tenant CRM, and must never be reachable
through tenant permission checks. This module owns the platform permission catalog and the
`requirePlatformRole` middleware; the platform features (cross-tenant metrics, per-tenant feature
flags, impersonation, the platform audit log) live in sibling `platform-*` modules.

## Structure

- `platform-access.constants.ts` — `PLATFORM_PERMISSION_CATALOG` (`platform:metrics:read`,
  `platform:features:manage`, `platform:impersonate`, `platform:impersonate:manage`,
  `platform:audit:read`), the `PlatformPermissionKey` union, and `isPlatformPermissionKey`.
- `platform-access.types.ts` — `PlatformPrincipal`, the shape stored on `res.locals.platform`.
- `platform-access.service.ts` — `permissionKeysFor(userId)`: resolves the user's membership in
  the platform organization (via `crm-access`'s repository) and returns the platform keys their
  role holds; the platform-org SUPERADMIN gets every key.
- `platform-access.middleware.ts` — `requirePlatformRole(key)` returns
  `[requirePlatformAccess, enforceKey]`: the existing role-and-membership gate followed by the
  specific-key check, which stamps `res.locals.platform`. `getPlatformPrincipal(res)` reads it
  back.
- `platform-access.integration.test.ts` — `permissionKeysFor` against a real database.

`apps/api/src/shared/db/prisma.ts` also gains `prismaRead` in this change: it is the primary
client unless `DATABASE_READ_URL` is set, so single-database deployments are unaffected. Aggregate
reads in `platform-metrics` will import `prismaRead`, so moving them to a replica later is a
one-line change with no call-site churn.

## Funnel

**User-facing:** a platform admin opens a platform-admin screen; the API allows the request only
if their platform-org role carries the matching `platform:*` key (or they are the platform-org
SUPERADMIN).

**Technical:** `router.get("/api/platform/…", ...requirePlatformRole(key), controller)` →
`requirePlatformAccess` (role is `ADMIN` + active platform-org membership that is SUPERADMIN or
holds `platform:access`) → `enforceKey` (`platformAccessService.permissionKeysFor` includes
`key`) → `res.locals.platform` set → controller.

## Non-obvious rationale

- **The platform catalog is deliberately separate from the tenant `PERMISSION_CATALOG` and is not
  in `SELECTABLE_ROLE_PERMISSION_KEYS`.** A tenant custom-role builder can never grant a
  `platform:*` key — the same "special, not automatic" treatment `platform:access` and
  `org:transfer_ownership` already get. The keys are still real `Permission` rows (seeded by
  `seed-crm.ts`) so `RolePermission`'s FK holds, and `seed-crm.ts` grants all of them to the
  platform org's built-in Admin role.
- **`platform-access` is exempt from the lint boundary that stops other `platform-*` modules from
  importing `crm-*` repositories.** That rule keeps the metrics/features/impersonation modules from
  reading tenant data through a tenant repository with the org filter dropped. `platform-access`
  is the access layer itself, so it legitimately resolves the platform-org membership through
  `crmAccessRepository`.
- **`requirePlatformRole` is the platform analogue of `crm-access`'s `requirePermission`** — same
  "stack the coarse gate, then the specific key, then stash the principal on `res.locals`" shape,
  but keyed off the platform organization rather than a tenant-resolved one, and never touching
  `resolveTenant`.
