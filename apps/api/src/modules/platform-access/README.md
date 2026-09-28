# Platform Access

## Purpose

The authorization layer for Outfiqe's own platform-admin surface — every route that manages the
marketplace itself (catalog, orders, users, creators, finance, gamification, moderation, support,
tenants) rather than one tenant's CRM. It owns the platform permission catalog, decides who counts
as platform staff, and gives every platform route an explicit permission, so a role such as
"Support only" can do support and nothing else.

## Structure

- `platform-access.constants.ts` — `PLATFORM_PERMISSION_CATALOG`, the `PlatformPermissionKey`
  union, `isPlatformPermissionKey`, and the named permission groups other modules route by
  (`SUPPORT_AGENT_PERMISSION_KEYS`, `BRAND_REVIEW_PERMISSION_KEYS`,
  `COUPON_MANAGEMENT_PERMISSION_KEYS`, `REVIEW_MODERATE_PERMISSION_KEY`,
  `CONTENT_MODERATE_PERMISSION_KEY`). Most sections have a read key and a manage key
  (`platform:catalog:read` / `platform:catalog:manage`, and so on for orders, users, creators,
  brands, withdrawals, coupons, commissions, gamification, organizations and announcements).
- `platform-access.service.ts` — `resolveAccess(userId)` returns `{ hasStaffAccess,
hasFullAccess, permissionKeys }` from the user's active membership in the platform
  organization; `permissionKeysFor`, `principalHasPermission`, and
  `findUserIdsHoldingAnyPermission(keys)` (used to pick notification recipients and support
  agents by permission).
- `platform-access.middleware.ts` — `requirePlatformRole(...keys)` returns
  `[requireAuth, requirePlatformAccess, enforceKey]`; the request passes when the user holds any
  one of the given keys. It reuses the access `requirePlatformAccess` already resolved for the
  request instead of querying twice, logs every refusal as `PLATFORM_ACCESS_DENIED` with the user,
  the keys needed and the route, and stamps `res.locals.platform`. `getPlatformPrincipal(res)`
  reads it back.
- `platform-access.guards.ts` — `platformGuards`, the named guard chains route files use
  (`catalogRead`, `catalogManage`, `ordersRead`, `ordersManage`, `usersRead`, `usersManage`,
  `userSearch`, `creatorsRead`, `creatorsManage`, `brandsRead`, `brandsManage`,
  `reviewsModerate`, `contentModerate`, `financeRead`, `withdrawRead`, `withdrawManage`,
  `teamManage`). A read guard accepts the read key or the manage key; a manage guard accepts only
  the manage key.
- `platform-access.types.ts` — `PlatformPrincipal`, `PlatformAccess`.
- `platform-access.constants.test.ts` — every key the shared section registry
  (`@outfiqe/utils` `PLATFORM_SECTION_ACCESS`) relies on exists here, and every section key added
  after the original catalog is inserted by the migration that grants it to the built-in Admin.
- `platform-route-guards.test.ts` — fails if any route file uses the loose
  `requirePlatformAccess` gate directly instead of an explicit permission.
- `platform-permissions.integration.test.ts` — a matrix over every platform route: a role holding
  only one accepted key gets in, a role holding an unrelated key or no platform key gets `403`,
  the built-in Admin gets in, anonymous callers get `401`, and co-founder-only routes refuse even
  a role holding every permission.
- `platform-access.integration.test.ts` — the resolver and recipient lookup against a real
  database.

## Funnel

**User-facing:** a co-founder builds a role on the Team page by ticking permissions (for example
"Read support requests" and "Reply to and move support requests") and invites someone onto it.
When that person signs in they land on the first section their role can open, the menu lists only
those sections, pages they can't open show a "You don't have access to this section" screen, and
buttons their role can't use are hidden. Anything they try anyway is refused by the server.

**Technical:** `router.get("/api/…", ...platformGuards.catalogRead, controller)` →
`requirePlatformAccess` (`UserRole.ADMIN` + `resolveAccess(...).hasStaffAccess`, cached on
`res.locals.platformAccess`) → `enforceKey` (holds one of the accepted keys) →
`res.locals.platform` → controller. The session (`auth` module) carries `platformPermissionKeys`
and a `hiddenPlatformNavKeys` list that already includes every section the role can't open, built
from `findInaccessiblePlatformSections` in `@outfiqe/utils`.

## Non-obvious rationale

- **"Platform staff" means holding at least one platform permission, not holding a special
  key.** `resolveAccess` treats an active platform-organization member as staff when their role
  holds any `platform:*` permission, or the legacy `platform:access` key, or they are a co-founder
  or the platform super admin. The earlier rule required `platform:access` alone, which no custom
  role could hold, so a "Support only" invitee landed on `/crm` and was refused everywhere. Giving
  every custom role `platform:access` was tried and reverted: about thirty route modules only
  checked that key, so it would have opened products, orders, users and more to a support agent.
- **Every platform route names its permission.** The loose `requirePlatformAccess` gate now only
  confirms "this is platform staff"; on its own it would admit a support agent to the catalog, so
  route files never use it directly — `platform-route-guards.test.ts` enforces that. New routes
  pick a guard from `platformGuards` or `requirePlatformRole(key)`.
- **Read endpoints accept the manage key too.** Someone who can edit coupons can obviously view
  them, so `requirePlatformRole` takes any-of keys and read guards list both.
- **The built-in Admin keeps full access through data, not a bypass.** The
  `add_section_platform_permissions` migration inserts the new keys and grants them to the
  platform organization's built-in Admin role, and `prisma/seed-crm.ts` (run on every deploy by
  `bootstrap-platform-crm.ts`) re-grants the whole catalog, so the grant also holds for keys added
  later.
- **The platform catalog stays separate from the tenant `PERMISSION_CATALOG`.** A tenant role can
  never hold a `platform:*` key, and a tenant staff account (`UserRole.TENANT_STAFF`) fails
  `requirePlatformAccess` before any key is checked.
- **Co-founder-only actions are not permissions.** Creating or editing roles, sending staff
  invites, changing navigation access and the image queue dashboard require `requireCoFounder`,
  because a role that could grant itself more power would make permissions meaningless.
- **`platform-access` may import `crm-access` repositories**, unlike the other `platform-*`
  modules: it is the access layer and resolves the platform-organization membership itself.
