# platform-nav-access

## Purpose

The co-founder group and the one global "which platform navbar items can non-co-founders see and
reach" config. A small exclusive set of platform admins (co-founders) always see the full navbar
and are the only accounts allowed to change what everyone else sees; every other platform admin
sees the navbar minus the hidden keys, and the sensitive surfaces also return `403` rather than
just hiding a link.

## Structure

- `platform-nav-access.routes.ts` — mounts under `/api/platform`. `GET /nav-access`
  (`requireAuth` + `requirePlatformAccess`, any platform admin) returns the overview. The three
  writes and `GET /nav-access/co-founders/candidates` are `requireCoFounder` + `crmWriteRateLimit`.
- `platform-nav-access.controller.ts` — thin: validate → service → `sendSuccess`, then
  `platformAudit.record` for every mutation.
- `platform-nav-access.service.ts` — the logic. `resolveFor(userId)` (fail-open) backs both the
  navbar filter data on `/auth/me` and the `requirePlatformNavItem` guard. `promoteCoFounder` /
  `demoteCoFounder` enforce the 4-cap and the last-co-founder floor inside a transaction.
- `platform-nav-access.repository.ts` — Prisma reads/writes for the single `PlatformNavAccess`
  row (self-bootstrapping) and the `Membership.isPlatformSuperAdmin` flag on the platform org.
- `platform-nav-access.middleware.ts` — `requireCoFounder` (chain) + `getCoFounderContext(res)`
  for the writes; `requirePlatformNavItem(navKey)` for the sensitive route files.
- `platform-nav-access.schemas.ts` — Zod for the write bodies/params. `hiddenNavKeys` entries are
  validated against `PLATFORM_NAV_KEYS` from `@outfiqe/types`.
- `platform-nav-access.constants.ts` — the Redis cache key + TTL for the hidden-keys list.
- `platform-nav-access.types.ts` — `NavAccessResolution`, `NavAccessOverview`, `CoFounderContext`,
  `CoFounderSummary`.

## Funnel

**User-facing:** a co-founder opens Admin → Platform → "Navigation access" (visible only to
co-founders), flips a per-item switch off, and every non-co-founder admin immediately loses that
navbar link and gets a "you do not have permission" error if they hit the page's API directly. The
same screen adds/removes co-founders (capped at 4, can't remove the last one). Co-founders see a
"Co-founder" badge under their name in the sidebar.

**Technical — reads:** `AdminSidebar` filters `PLATFORM_NAV_ITEMS` using `isCoFounder` +
`hiddenPlatformNavKeys` that `GET /api/auth/me` now returns — `auth.service.ts`'s
`resolvePlatformFields` calls `platformNavAccessService.resolveFor`, which reads the singleton
config (Redis-cached, 30s) and the caller's platform-org membership flag, failing open to
`{ isCoFounder: false, hiddenNavKeys: [] }`.

**Technical — enforcement:** each sensitive admin route file stacks
`requirePlatformNavItem("<key>")` after `requirePlatformAccess` (or after the
`requirePlatformRole(...)` spread for `platform-features` / `platform-impersonation`). The guard
calls the same `resolveFor`; a co-founder always passes, otherwise a hidden key → `403`. It also
fails open (`next()`) on an internal error so a config-store blip never blanks a whole surface.

**Technical — writes:** controller → `platformNavAccessService` → repository, then
`platformAudit.record`. Promote/demote run a `prisma.$transaction` with a live count check so the
4-cap and last-co-founder floor can't be raced.

## Non-obvious rationale

- **The config is an override, not a prerequisite.** The `PlatformNavAccess` row self-bootstraps
  to `hiddenNavKeys: []` on first read/write, and every read path falls back to "nothing hidden"
  on error. A missing or unreachable config must never hide the navbar or `403` every sensitive
  route — same stance as the withdraw-policy bootstrap work.
- **Server-enforced vs. nav-only.** Only `SERVER_ENFORCED_PLATFORM_NAV_KEYS` (money + ops:
  gamification, commissions, platform-commission, withdraw-requests, withdraw-policy,
  financial-rollup, impersonation, feature flags, team, organizations) get `requirePlatformNavItem`
  on their routes. The pure-catalog keys (products, collections, orders, …) are navbar declutter
  only — every platform admin already has that access, so there's nothing to guard server-side.
- **`gamification` is a cluster.** One nav key, but its screens hit five API modules — `xp`,
  `badges`, `challenges`, `creator-leaderboard`, `creator-competitions` — so the guard is added to
  all five admin route groups.
- **`/api/users/*` is deliberately not guarded** under `team`. The admin Team screen only uses
  `/admin/invites`; `/users/search` is shared infrastructure (gamification manual actions), so
  gating it under `team` would break unrelated screens.
- **Co-founder seed** (`prisma/seed-crm.ts` → `seedPlatformCoFounders`) only flips the flag for
  the known accounts and warns (never throws) for any missing — an account with no active
  platform-org membership is skipped, not created. The local parts are `prapti.bidari` /
  `mun.khatiwada` / `anjesh.ghimire` / `admin` at `@outfiqe.com` when `APP_ENV=prod`, otherwise
  `@outfiqe.local`; set `PLATFORM_CO_FOUNDER_EMAILS` (comma-separated) to override the list
  entirely. Four names fills the `MAX_PLATFORM_CO_FOUNDERS` cap, so the seed leaves no room to
  promote a fifth from the UI until one is removed.

## Deferred

- The "Co-founder" badge on the admin Team screen needs the `/admin/invites` list to carry
  per-row co-founder status (invites are keyed by email, not membership); not done here.
