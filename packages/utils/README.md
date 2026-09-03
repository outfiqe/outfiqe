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
- `index.ts` — re-exports everything above; every app only ever imports from `@outfiqe/utils`.

## Non-obvious rationale

**`formatActorList` pluralizes off `actorCount`, the notification's true total actor count —
never `recentActors.length`.** The write path caps `recentActors` at 3 (`MAX_RECENT_ACTORS`, see
`apps/api/src/modules/notifications/README.md`) so the metadata payload stays small, but the
displayed count still needs to reflect the real number of people who liked/followed, not just how
many names got stored.
