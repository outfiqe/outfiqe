# badges

## Purpose

The badge catalog and a user's collection of it: what badges exist, which ones a given user has collected, their visibility/featured state, and the public profile showcase. Owns `Badge`/`UserBadge` reads and the collection-facing writes (display toggle, featured order). Awarding a badge is `achievements`' job (spec 16's rule engine); this module never creates a `UserBadge` row itself.

## Structure

- `badge.constants.ts` — `MAX_FEATURED_BADGES` (6), `BADGE_SHAPE` (the fixed shape enum spec 14's MVP `designConfig` supports).
- `badge.schemas.ts` — `badgeDesignConfigSchema` (the Zod validator for `Badge.designConfig`'s untyped JSON — `{ shape, primaryColor }`), plus the request schemas for the display-toggle and featured-order endpoints.
- `badge.types.ts` — raw repository record shapes (`designConfig: unknown`, unparsed) vs. the parsed response shapes (`BadgeCollectionEntry`, `FeaturedBadgeView`) — the same "repository returns raw, service parses" split `achievements` already uses for `requirementConfig`.
- `badge.repository.ts` — Prisma queries only: `listActiveBadges`, `listUserBadgeStates`, `updateDisplay`, `findOwnedBadgeIds` (ownership check for the featured-order write), `clearFeatured`/`setFeatured` (take a `DbClient` so `badge.service.ts` can compose them inside one transaction), `listFeaturedForUser`.
- `badge.service.ts` — `listCollectionForUser` (the spec 19–23 combined collected+locked view), `updateDisplay`, `updateFeatured`, `listFeaturedForUser` (consumed by `../creators`' public profile, not just this module's own routes).
- `badge.controller.ts` / `badge.routes.ts` — `GET /badges/collection`, `PATCH /badges/:badgeId/display`, `PATCH /badges/featured`. All `requireAuth`-only, scoped to the caller's own collection — there's no "view someone else's full collection" endpoint yet, only the public-profile featured subset (`../creators`).

## Funnel

**User-facing:** nothing yet — this chunk is backend only. The collectible-library UI (spec 19, filters, locked-badge progress bars, drag-reorder) lands in the next chunk on top of these three endpoints.

**Technical:** `GET /badges/collection` reads the full active badge catalog, the caller's `UserBadge` rows, and — via `achievementService.listProgressForUser` — live progress for everything still locked, then merges all three into one array per badge (`isCollected`, and either the unlock timestamp/display state or a `progress` breakdown, never both). Both write endpoints touch only rows the caller actually owns (`removedAt: null`); featuring re-validates ownership explicitly before touching anything, on top of the same guard the repository's `WHERE userId = ...` already provides.

## Non-obvious rationale

**`Badge.isPublic` gates _locked_ visibility, not collected visibility.** A badge with `isPublic: false` is omitted from `listCollectionForUser` entirely while locked (a "secret" badge that doesn't spoil itself by appearing as a mystery placeholder) — but once collected, every badge shows regardless of `isPublic`, since hiding something a user has actually earned would contradict "collectible achievement library." None of the MVP catalog uses `isPublic: false` yet (all seeded `true`); this exists for when an admin sets one later.

**Featuring is a full-replace, not an incremental add/remove.** `PATCH /badges/featured` (kept as `PATCH`, matching this codebase's REST convention — the shared `apiClient` only exposes `get`/`post`/`patch`/`del`, `PUT` doesn't appear anywhere in this repo) still replaces the _whole_ featured set in one call: `updateFeatured(userId, badgeIds)` clears every currently-featured badge for the user and re-sets exactly the given ordered list in one transaction, matching how a drag-reorder UI naturally submits ("here's my new featured lineup") rather than a sequence of individual position edits that could race against each other.

**Featured and displayed are independent flags, not coupled.** A badge can be `isFeatured: true` while `isDisplayed: false` — it simply won't appear in `listFeaturedForUser`'s output (which requires both). This matches spec 24's literal wording ("only badges marked visible appear in that order on the public profile") rather than assuming a user always wants a featured badge shown; forcing the coupling would be a product decision this module doesn't need to make unilaterally.

**Design-config parse failures skip the badge, they don't fail the whole request.** `parseDesignConfig` (used by both `listCollectionForUser` and `listFeaturedForUser`) logs and returns `null` on an invalid `designConfig` rather than throwing — the same fail-open shape `achievements` already uses for a malformed `requirementConfig`. One admin-edited bad JSON value shouldn't take down a user's entire collection view or someone else's public profile.
