# @outfiqe/utils

## Purpose

Small, pure, framework-free helper functions and constants shared by `apps/api`, `apps/web`, and
`apps/admin` — string/enum formatting, display derivation, and validation regexes that don't belong
to any one app.

## Structure

- `avatar/` — `getAvatarColor` (deterministic palette color from an id) and `initialsFor` (a
  display name's fallback avatar initial).
- `format/` — `toTitleCase`, a generic `SNAKE_CASE` -> `Title Case` formatter.
- `phone/` — `NEPAL_PHONE_REGEX`, the phone-number validation pattern this codebase's forms use.
- `tenant/` — `extractTenantSubdomain(host, baseDomain)` / `isTenantHost(host, baseDomain)` plus
  `TENANT_SUBDOMAIN_REGEX`/`RESERVED_TENANT_SUBDOMAINS`, the one definition of "what counts as a
  tenant subdomain". `apps/api`'s `crm-access` module re-exports these as `extractSubdomain`/
  `SUBDOMAIN_REGEX`/`RESERVED_SUBDOMAINS` for its `resolveTenant` middleware; `apps/web`
  (`useTenantHost`) and `apps/admin` (`isOnTenantHost`) use them to only show the storefront ⇄ CRM
  cross-links, and only honour a cross-app `?redirect=` after login, when the browser is actually on
  a tenant subdomain rather than the apex domain.
- `product-sort/` — `PRODUCT_SORT_VALUES`/`PRODUCT_SORT`/`ProductSort`, the shop's sort-order enum.
- `product-type/` — `DEFAULT_PRODUCT_TYPES`, the seed/migration list of garment types. Garment
  types are now an admin-managed table (`apps/api/src/modules/product-types`); this constant only
  bootstraps the six originals.
- `notifications/` — `formatActorList`, the grouped-notification actor-list formatter (`"Jane"` ->
  `"Jane and John"` -> `"Jane, John and 3 others"`), used by `@outfiqe/components`'
  `resolveNotificationMessage.ts`.
- `uuid/` — `generateUuid`, an RFC 4122 v4 UUID generator that falls back to
  `crypto.getRandomValues` when `crypto.randomUUID` isn't available.
- `index.ts` — re-exports everything above; every app only ever imports from `@outfiqe/utils`.

## Non-obvious rationale

**`generateUuid` doesn't just call `crypto.randomUUID()` directly** — that method requires a
secure context (HTTPS, or the browser's `localhost` exception), which not every environment this
app is accessed from satisfies (a LAN IP over plain HTTP during on-device testing, for one).
`crypto.getRandomValues`, unlike `randomUUID`, has no such restriction, so the fallback path
constructs an RFC 4122 v4 UUID from it by hand — same randomness quality, no secure-context
requirement. Every call site across the apps that generates a client-side id (idempotency keys,
optimistic-update temp ids, the anonymous session id) should use this instead of
`crypto.randomUUID()` directly.

**`formatActorList` pluralizes off `actorCount`, the notification's true total actor count —
never `recentActors.length`.** The write path caps `recentActors` at 3 (`MAX_RECENT_ACTORS`, see
`apps/api/src/modules/notifications/README.md`) so the metadata payload stays small, but the
displayed count still needs to reflect the real number of people who liked/followed, not just how
many names got stored.
