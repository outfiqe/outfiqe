# achievements

## Purpose

The achievement rule engine: evaluates a user's live platform stats against admin-configured conditions (spec 16), and — when every condition is met — awards the linked `Badge` (`UserBadge`) and its XP reward. Owns evaluation only; the badge catalog itself (creation, rarity, design, collection reads) belongs to `badges` (a later chunk).

## Structure

- `achievement.constants.ts` — `ACHIEVEMENT_METRIC` (the closed set of metrics the engine currently understands), `CONDITION_OPERATOR` (`gte`/`gt`/`eq`/`lte`/`lt`), `ACHIEVEMENT_XP_SOURCE`.
- `achievement.schemas.ts` — `achievementRequirementConfigSchema`, the Zod validator for `Achievement.requirementConfig`'s JSON shape (`{ conditions: [{ metric, operator, value }] }`) — the untyped-JSON-boundary validation CLAUDE.md's data-model conventions call for, not a blind cast.
- `achievement.types.ts` — `EligibleAchievementRecord` (a parsed, ready-to-evaluate achievement), `MetricSnapshot`, `AchievementProgressView`.
- `achievement.utils.ts` — pure functions only: `isConditionMet`/`areAllConditionsMet` (the actual rule evaluator) and `currentValueForCondition`. No DB access — unit tests live here.
- `achievement.repository.ts` — Prisma queries only: `findEligibleAchievements` (active, non-admin-award achievements the user hasn't already unlocked) and one query per metric (`countActiveLooks`, `sumLikesReceived`, `countCommentsMade`, `countPurchases`, `countSalesGenerated`, `sumViewsReceived`), plus `createUserBadge`.
- `achievement.service.ts` — `evaluateForUser` (the engine entry point: load eligible achievements → build one batched metric snapshot → award whichever now pass) and `listProgressForUser` (the read-only spec 18 equivalent, same snapshot logic, no awarding).
- `achievement.events.ts` — `registerAchievementEventConsumers()`: an independent second consumer group (`achievement-check`) on the same domain event streams `xp.events.ts` already subscribes to — Redis Streams supports multiple independent consumer groups per stream, so this doesn't interfere with or depend on the `xp` module's own consumers.
- `achievement.schemas.ts` (query) / `achievement.controller.ts` / `achievement.routes.ts` — `GET /api/achievements/me/progress` (spec 18), `requireAuth`-only.

## Funnel

**Technical:** a triggering domain event (`LOOK_CREATED`, `LOOK_LIKED`, `LOOK_COMMENTED`, `PRODUCT_PURCHASED`, `SALE_GENERATED`, `LOOK_VIEWED`) fires → `achievement.events.ts` calls `evaluateForUser(relevantUserId)` → the service loads every active, not-yet-unlocked achievement for that user, computes the union of metrics their conditions reference, fetches each exactly once (batched, in parallel), and checks every eligible achievement against that one snapshot. Anything that now passes gets a `UserBadge` row and, if the badge carries an XP reward, an `ACHIEVEMENT_UNLOCKED` transaction via `xpService.grantFixedXp` (see `xp/README.md` for why this bypasses the normal config-gated `awardXp` path).

**User-facing:** nothing yet — this chunk has no UI. A user's badge collection becomes visible once the `badges` module (a later chunk) builds the collection/profile-showcase surface on top of `UserBadge`.

## Non-obvious rationale

**Full re-evaluation per triggering event, not a metric-to-achievement dependency graph.** On every qualifying event, `evaluateForUser` re-checks _all_ of a user's still-locked, active achievements — not just the one whose metric the triggering event obviously touches. With a 14-badge catalog and 6 metrics this is cheap, and it sidesteps a real correctness gap a narrower "only re-check achievements that use this event's metric" design would have: a compound achievement's last-needed condition can be satisfied by a _different_ event than the one that finally pushes it over the line (see the `level` note below). Revisit with a proper dependency graph only if the catalog grows enough for this to matter.

**Compound (multi-condition) achievements are eventually consistent, not live.** `Fashion Mentor` (`comments_made >= 100 AND level >= 5`) only gets re-checked on events that are wired as achievement triggers — currently `LOOK_CREATED`/`LOOK_LIKED`/`LOOK_COMMENTED`/`PRODUCT_PURCHASED`/`SALE_GENERATED`. Every metric a seeded achievement uses (including `level`, which changes as a side effect of _any_ XP-earning event) is read fresh from the DB at check time, so this is never _wrong_ — but if a user's final qualifying condition is satisfied by an event nothing subscribes to for achievement purposes (there currently isn't one, since XP-earning events and achievement-trigger events are the same set), the unlock would simply wait for the next qualifying event instead of firing instantly. Adding a new metric later means adding whichever event(s) can move it to `achievement.events.ts` too — it doesn't happen automatically.

**`ADMIN_AWARD`-type achievements are excluded at the query level, not filtered after the fact.** `findEligibleAchievements` never returns them — `requirementType: { not: ADMIN_AWARD }` — so `Outfiqe OG`'s empty `{ conditions: [] }` requirementConfig (which would otherwise fail `achievementRequirementConfigSchema`'s `.min(1)`) never reaches the parser. Manual-only badges are awarded through the admin chunk's own path, never by this engine.

**Eligibility (not "is this badge still valid") is the only re-unlock guard, and that's deliberate.** "Not yet unlocked" is checked via `badge.userBadges.none({ userId })` — a badge the user already has, even one an admin has since _removed_ (`UserBadge.removedAt` set, spec 33's "reversible, always logged" — the row is never deleted), is never re-evaluated or re-awarded. The engine only ever awards a badge once per user, full stop; re-instating a manually-removed badge is an admin action, not something a future qualifying event should silently undo.

**`purchases_count`/`sales_count` don't reverse on cancellation or void**, matching the same accepted simplification already made for `PRODUCT_PURCHASED`/`SALE_GENERATED` XP (see `xp/README.md`) — a cancelled COD order or a voided commission still counts toward these metrics once it's happened. Consistent with the rest of this build's "speculative, not retroactively reversed" XP philosophy, not an oversight.
