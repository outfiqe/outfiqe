# Platform Suspensions

## Purpose

Lets a platform admin suspend, ban, or restore an individual `User` account — the moderation
primitive this platform previously had none of (`creatorStatus` only gates the creator-approval
flow, not login/access). Brand-level suspension, the auto-expiry sweep, and the mid-session
enforcement gate (Redis-backed `requireActiveAccount`) are tracked as follow-ups below, not built
yet.

## Structure

- `platform-suspensions.types.ts` — service input/output shapes.
- `platform-suspensions.schemas.ts` — zod bodies (`reason` required, `durationHours` optional on
  suspend only) and the `:userId` param.
- `platform-suspensions.constants.ts` — the Redis suspension-flag TTL padding, used once the
  `requireActiveAccount` gate lands (see Follow-ups).
- `platform-suspensions.repository.ts` — race-safe conditional `updateMany` writes for
  suspend/ban/unsuspend/unban, pattern-matched to `orderRepository.markCancelled`
  (`apps/api/src/modules/orders/order.repository.ts`): every write is scoped to the expected prior
  `accountStatus`, and a `0`-row result means someone already changed it, not a signal to
  read-then-write again.
- `platform-suspensions.service.ts` — orchestration: permission checks, the suspend/ban
  transaction (status flip + refresh-token revocation, atomic), the Redis suspension flag, audit
  logging, and domain-event publishing.
- `platform-suspensions.controller.ts` / `.routes.ts` — mounted at `/api/platform`, gated by
  `requirePlatformRole("platform:suspensions:manage")`.

## Funnel

**User-facing:** an admin opens a user's record, picks Suspend (with a reason and an optional
duration) or Ban, or reverses either action. The affected person is logged out everywhere (every
refresh token is revoked) and, on their next login attempt, sees a clear `ACCOUNT_SUSPENDED`
rejection instead of a generic credentials error.

**Technical:** `platformSuspensionsRoutes` → `requirePlatformRole` → `platformSuspensionsController`
→ `platformSuspensionsService` → `platformSuspensionsRepository` (conditional write) +
`authRepository.deleteAllRefreshTokensForUser` (same transaction) → `platformAudit.record` +
`eventBus.publish` (both after commit, both fire-and-forget — a suspension write must never fail
because its own audit/event side-channel hiccuped). `auth.service.ts#login` reads
`user.accountStatus` directly (no dependency on this module) right where `EMAIL_NOT_VERIFIED` is
already checked.

## Non-obvious rationale

- **Admins can't be moderated, by anyone, including themselves.** `assertTargetIsModerable` rejects
  `UserRole.ADMIN` targets outright. This isn't in the source spec this feature was built from — it
  closes an abuse/lockout vector that only exists once this endpoint does.
- **A ban must be lifted by a different admin than the one who imposed it**
  (`findLatestBanActorUserId` reads the most recent `user.banned` `PlatformAuditLog` row for the
  target and compares `actorUserId`). Plain suspensions have no such restriction — any
  platform-access admin can impose or reverse one, including their own. This asymmetry is
  deliberate: suspension is meant to be cheap and reversible, a ban is meant to have one piece of
  built-in friction against a single admin unilaterally imposing and un-imposing it.
- **`authRepository.deleteAllRefreshTokensForUser` gained an optional transaction-client
  parameter** (it previously hardcoded the global `prisma` client) specifically so it can run
  inside the same `$transaction` as the status flip — without that, a crash between the two writes
  could leave a suspended account with live refresh tokens.
- **No separate suspension-history table.** `PlatformAuditLog` already records who/when/why/what
  for every admin action; the columns on `User` are just "current state," the same relationship
  `creatorStatus` already has to its own history.

## Follow-ups (tracked here, not yet built)

- **Mid-session enforcement.** `requireAuth` verifies the JWT only and never touches the DB, so an
  already-issued access token stays valid until it naturally expires even after suspension. A new
  `requireActiveAccount` middleware (Redis `GET` on `redisKeys.suspendedUser(userId)`, written/
  cleared by this module) needs to be composed after `requireAuth` on write-side routes — orders,
  cart, checkout, creator-looks writes, chat, product management, withdraw, brand management —
  with `support`, `auth/logout`, and a "my status" read explicitly exempted so a suspended user can
  still appeal. `SUSPENSION_REDIS_TTL_PADDING_SECONDS` in `platform-suspensions.constants.ts` is
  already sized for this.
- **Socket kick + suspension/ban/restoration emails.** `DomainEvents.USER_SUSPENDED` /
  `USER_BANNED` / `USER_UNSUSPENDED` are published today but have no consumers yet.
- **Auto-expiry sweep.** `platformSuspensionsRepository.findExpiredSuspendedUserIds` exists;
  nothing calls it yet. Needs a `platform-suspensions.expiry.ts` job (pattern: `runAuthRetentionSweep`,
  `apps/api/src/modules/auth/auth.retention.ts`) registered in
  `apps/api/src/jobs/scheduled-jobs.ts`, calling `unsuspendUser` with no `actorUserId` (already
  supported — it skips the audit-log write and just logs, matching how the sweep isn't a staff
  action) so a temporary suspension actually lifts itself.
- **`Brand`-level suspension.** The `AccountStatus` columns already exist on `Brand`
  (this migration added both at once to avoid a second migration purely for mirrored fields), but
  no service/route/cascading guard exists yet — product-listing visibility, order-fulfilment
  freeze, withdraw freeze, and `assertBrandActive` on brand-scoped writes are all still to build.
- **Admin UI.** No `/users` list/detail page exists in `apps/admin` yet to drive any of this.
