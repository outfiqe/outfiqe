# xp

## Purpose

The XP engine: awards XP for qualifying platform activity, enforces the anti-abuse rules an admin configures per activity, and keeps each user's running level (spec 08/09) in sync. Owns `Level` alongside XP — a level is a pure function of `totalXp`, with no independent write path of its own, so it doesn't warrant a separate module (same reasoning `commissions` bundles tier config with the commission ledger).

## Structure

- `xp.types.ts` — `LevelRecord`, `ActivityXpConfigRecord`, `AwardXpInput`/`AwardXpResult`, `UserProgressView`.
- `xp.constants.ts` — `ONE_DAY_MS` (anti-abuse window), `XP_SOURCE` (the `source` values callers pass — one per producing module).
- `xp.utils.ts` — pure functions only: `computeLevelProgress` (resolve a user's level + next level from a sorted ladder), `xpToNextLevel`, and the three anti-abuse predicates (`hasReachedMaxPerEntity`, `isWithinCooldown`, `hasReachedDailyLimit`). No DB access — this is where the unit tests live.
- `xp.repository.ts` — Prisma queries only. Functions that participate in the award transaction (`createTransaction`, `incrementProgress`, `setCurrentLevel`) take a `DbClient` parameter so `xp.service.ts` can compose them inside one `prisma.$transaction`, same pattern as `commissions`' `createPending(client, input)`.
- `xp.service.ts` — `awardXp` (the engine entry point) and `getProgressForUser`.

No `routes.ts`/`controller.ts` yet — this chunk is the engine only. `GET /api/xp/me` and the transaction-history endpoint land in a later chunk once there's a UI to serve.

## Funnel

**Technical:** a producing module (`creator-looks`, `follows`, `payments`, `commissions`, ...) calls `xpService.awardXp({ userId, activityType, relatedEntityId?, source, metadata? })` after its own write has already succeeded — XP is a side effect of an activity, never a precondition for it. `awardXp` reads `ActivityXpConfig` for that activity, runs the configured anti-abuse checks, and — if none reject it — writes an `XpTransaction` row and atomically increments `UserProgress.totalXp` in one transaction, recomputing `currentLevelId` only if it actually changed.

**User-facing:** nothing yet — this chunk has no read surface. A user's XP/level becomes visible once the progress UI chunk adds `GET /api/xp/me` on top of `getProgressForUser`.

## Non-obvious rationale

**Award is fail-open, not fail-closed.** A Redis-style "never fail the caller's request" convention, applied to Postgres here instead: any error inside `awardXp` (a bad config row, a transient DB error) is caught, logged via `logger`/`describeError`, and returned as a typed `{ awarded: false }` — the like/follow/purchase that triggered it must never fail because XP bookkeeping hiccupped.

**`ActivityXpConfig` has no row for every `XpActivityType` value.** `FOLLOWER_MILESTONE` and `ADMIN_ADJUSTMENT` are valid ledger tags but deliberately have no config row: a follower-count milestone is achievement-awarded (via `Badge.xpReward`, once the achievements engine exists), not a flat per-occurrence amount, and a manual admin adjustment has no "default" amount by definition — the admin enters one each time. Calling `awardXp` with either activity type today correctly no-ops as `ACTIVITY_DISABLED` (no config found); a dedicated `applyManualXpAdjustment` path for admin use lands in the admin chunk instead of overloading `awardXp`.

**Level recompute avoids a lost-update race without pessimistic locking.** `incrementProgress` uses Postgres's atomic `UPDATE ... SET total_xp = total_xp + $amount` (via Prisma's `increment`), never a read-then-write of `totalXp` in application code — two concurrent awards for the same user (a viral post getting rapid-fire likes) can't stomp on each other. The "previous level" needed to detect a level-up is derived arithmetically from the authoritative post-increment total (`updatedTotalXp - amount`) rather than a separate read taken before the transaction, which would itself be race-prone under READ COMMITTED.

**Anti-abuse dedup (spec 06's "follow a creator only earns XP once") is a plain existence check, not a DB constraint.** `maxPerEntity` is enforced by counting existing `XpTransaction` rows for `(userId, activityType, relatedEntityId)` before writing a new one — a read-then-write, not an atomic constraint. Accepted as a minor, low-severity race (worst case: one duplicate small XP award under true concurrent double-submission of the same action), the same class of tradeoff already accepted elsewhere in this codebase for non-financial, non-scarce data — unlike stock decrement, XP has no correctness requirement that justifies a DB-level uniqueness constraint here.

**Daily limits are a rolling 24h window, not a calendar-day reset.** Simpler than tracking timezone-aware "midnight" boundaries, and functionally equivalent for the stated goal (cap how much XP one activity can produce per day).
