# feature-flags

## Purpose

Global switches for whole features of the shared storefront, such as Outfit Build. A feature can be
off for everyone, on for an allow list of people and brands, or on for everyone. This is what lets a
finished feature ship dark, open to a few beta brands, then launch, and be switched off again at
once if something goes wrong.

## Structure

- `feature-flags.registry.ts` — `FEATURE_FLAG_REGISTRY`, every flag with its label and description.
  Flags are declared in code so a typo can't quietly become a new flag.
- `feature-flags.utils.ts` — `isFlagOnFor(flag, viewer)`, the one rule for who sees a feature, plus
  small helpers.
- `feature-flags.repository.ts` — reads and writes `feature_flags`, checks allow-list ids exist,
  and looks up a person's brand memberships.
- `feature-flags.service.ts` — `isEnabledForUser(key, userId)` for the rest of the app,
  `list()` and `update()` for admins.
- `feature-flags.middleware.ts` — `requireFeatureFlag(key)`, for any route that belongs to a
  flagged feature.
- `feature-flags.schemas.ts`, `.controller.ts`, `.routes.ts` — the admin API.
- `feature-flags.types.ts`, `.constants.ts` — shapes, the cache lifetime and the allow-list size
  limit.

## HTTP surface

Both require `platform:flags:manage`, which only super admins have unless a role grants it.

- `GET /api/platform/feature-flags` — every flag with its rollout and allow lists.
- `PUT /api/platform/feature-flags/:key` with `{ rollout, allowedUserIds, allowedBrandIds }` —
  `rollout` is `OFF`, `ALLOW_LIST` or `EVERYONE`. Unknown user or brand ids are refused with `422`
  and listed in `details`. Every change is audited with the old and new settings.

## Funnel

**User-facing:** a super admin sets Outfit Build to "allow list" with five beta brands. People on
those brands, and anyone named directly, now see the feature. Everyone else gets a plain "not
found", as if it didn't exist. Setting the rollout back to `OFF` hides it again for everyone
within five seconds.

**Technical:** a flagged route stacks `requireAuth` (or `optionalAuth`) then
`requireFeatureFlag(key)` → `featureFlagsService.isEnabledForUser` → cached flag state, plus a
brand-membership lookup only when the allow list names brands → `isFlagOnFor`. Socket joins and
background jobs call `featureFlagsService.isEnabledForUser` directly.

## Non-obvious rationale

**Separate from `../platform-features`.** That module switches features per CRM tenant
(`organizationId`), with plan defaults. Storefront features like Outfit Build belong to the one
shared marketplace, and creators aren't tenants at all, so they need a global switch with person and
brand allow lists instead. The planned gamification switch belongs here too.

**`OFF` keeps the allow lists.** The kill switch is one field. Turning a beta feature off and on
again doesn't mean re-entering the beta brands.

**It fails closed.** A flag with no row, or a flag that can't be read because the database is
down, counts as `OFF`. A hidden feature is the safe failure for something that isn't launched yet.

**A hidden route answers `404 FEATURE_NOT_AVAILABLE`, not `403`,** so a switched-off feature looks
like it doesn't exist rather than like something the caller isn't allowed to see.

**Cached for 5 seconds per process**, short enough that the kill switch works almost at once and
long enough that a busy route doesn't read the table on every request.
