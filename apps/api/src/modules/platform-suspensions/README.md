# Platform Suspensions

## Purpose

Lets a platform admin suspend, ban, or restore an individual `User` account or a `Brand` — the
moderation primitive this platform previously had none of (`creatorStatus` only gates the
creator-approval flow, not login/access, and `Brand` had no status field at all). A suspended or
banned user is rejected at login, cut off mid-session on every gated route within one request,
kicked off any live Socket.IO connection, and emailed. A suspended brand disappears from the
storefront, has its order fulfilment and withdrawals frozen, and stays that way until an admin
lifts it or a temporary suspension expires on its own. The admin UI to drive any of this from
`apps/admin` is the one piece not built yet (see Follow-ups).

## Structure

- `platform-suspensions.types.ts` — service input/output shapes, for both `User` and `Brand`.
- `platform-suspensions.schemas.ts` — zod bodies (`reason` required, `durationHours` optional on
  suspend only) and the `:userId`/`:brandId` params.
- `platform-suspensions.constants.ts` — the Redis suspension-flag TTL padding and the auto-expiry
  sweep interval.
- `platform-suspensions.repository.ts` — race-safe conditional `updateMany` writes for
  suspend/ban/unsuspend/unban (`User`) and suspend/unsuspend (`Brand`), pattern-matched to
  `orderRepository.markCancelled` (`apps/api/src/modules/orders/order.repository.ts`): every write
  is scoped to the expected prior `accountStatus`, and a `0`-row result means someone already
  changed it, not a signal to read-then-write again.
- `platform-suspensions.service.ts` — orchestration: permission checks, the suspend/ban
  transaction (status flip + refresh-token revocation, atomic, `User` only), the Redis suspension
  flag (`User` only), audit logging, and domain-event publishing.
- `platform-suspensions.controller.ts` / `.routes.ts` — mounted at `/api/platform`, gated by
  `requirePlatformRole("platform:suspensions:manage")`.
- `platform-suspensions.socket.ts` — on `USER_SUSPENDED`/`USER_BANNED`, emits
  `SOCKET_EVENTS.ACCOUNT_SUSPENDED` into the user's Socket.IO room then disconnects every socket in
  it (registered in `registerRealtimeConsumers`, `apps/api/src/processes/consumers.ts`).
- `platform-suspensions.events.ts` — on every suspend/ban/unsuspend event for both `User` and
  `Brand`, sends the matching email (`accountSuspendedTemplate`/`accountBannedTemplate`/
  `accountRestoredTemplate`/`brandSuspendedTemplate`/`brandRestoredTemplate`,
  `#email-templates/templates.js`), fire-and-forget like every other transactional email here
  (registered in `registerBackgroundConsumers`). The brand emails go to the brand's `OWNER`
  membership, looked up via `brandRepository.findOwnerUserId`.
- `platform-suspensions.expiry.ts` — `runSuspensionExpirySweep`, registered as the
  `suspension-expiry-sweep` interval job (`apps/api/src/jobs/scheduled-jobs.ts`, every 5 minutes):
  finds every `User`/`Brand` whose `suspensionExpiresAt` has passed and lifts it through the exact
  same service path a manual unsuspend uses, just with no `actorUserId` (skips the audit-log write
  — this isn't a staff action — but still clears the Redis flag and fires the "welcome back" email).
  `BANNED` accounts are never touched by this sweep; `suspensionExpiresAt` is always forced `null`
  when banning.
- `apps/api/src/shared/middlewares/require-active-account.ts` — lives outside this module (it's a
  cross-cutting Express middleware, not suspension-specific logic) but is this module's other half:
  `requireActiveAccount` checks the Redis flag this module writes/clears, and `requireActiveAuth`
  (`[requireAuth, requireActiveAccount]`) is the composed chain routes opt into.
- `apps/api/src/shared/utils/brand-guard.utils.ts` — `requireBrandId(userId)` is the single choke
  point nearly every brand-scoped write already resolved its brand through; it now also throws
  `403 BRAND_SUSPENDED` when that brand isn't `ACTIVE`, which is what makes the withdraw/order/
  product-management freezes below work without touching each of those modules individually.
  `brandService.assertActive(brandId)` covers the one write path that doesn't go through
  `requireBrandId` (`brandService.updateMyBrand`).

## Funnel

**User-facing:** an admin opens a user's or brand's record, picks Suspend (with a reason and an
optional duration) or Ban (`User` only), or reverses either action. For a `User`: they're logged
out everywhere (every refresh token revoked), any open tab is force-disconnected within seconds, an
email explains why, and their next login attempt shows a clear `ACCOUNT_SUSPENDED` rejection
instead of a generic credentials error. Mid-session, their very next request to a gated route is
rejected the same way — they don't get to keep acting until their access token happens to expire.
For a `Brand`: its products vanish from the storefront and creator-look feeds, its owner can't edit
its profile or manage its listings, its pending orders freeze in place (no auto-cancel — an admin
reviews each one), and it can't request a withdrawal — all without touching a single staff `User`
row, since a person can work for more than one brand. A temporary suspension on either kind of
account lifts itself automatically; a ban never does.

**Technical:** `platformSuspensionsRoutes` → `requirePlatformRole` → `platformSuspensionsController`
→ `platformSuspensionsService` → `platformSuspensionsRepository` (conditional write) +
`authRepository.deleteAllRefreshTokensForUser` (same transaction, `User` only) → Redis flag
write/clear (`User` only) + `platformAudit.record` + `eventBus.publish` (all after commit, all
fire-and-forget — a suspension write must never fail because a side-channel hiccuped).
`auth.service.ts#login` reads `user.accountStatus` directly (no dependency on this module) right
where `EMAIL_NOT_VERIFIED` is already checked. Every request to a route composed with
`requireActiveAuth` re-checks the Redis flag via `requireActiveAccount` after `requireAuth`
verifies the JWT. Every brand-scoped write that resolves its brand via `requireBrandId` re-checks
`Brand.accountStatus` on every call, no caching. `computeChatAvailability`
(`apps/api/src/modules/chat/chat.service.ts`) checks both chat participants' `accountStatus` at the
same point it already checks blocks and chat-enabled settings. Product/creator-look public queries
join `brand`/`creator` and filter `accountStatus: ACTIVE` (see
`apps/api/src/modules/products/product.repository.ts`'s `buildPublicWhere` and every other
`ProductStatus.APPROVED` query site there, and `hydrateFeedPosts` in
`apps/api/src/modules/creator-looks/creatorLook.repository.ts`, the single hydration step every
feed tab and the single-post page funnel through).

**Routes gated by `requireActiveAuth` today:** the shopper and brand-owner guards in `orders`,
`cart`, and `products`; all of `withdraw`'s and `chat`/`conversation`'s non-admin routes; `brands`'
`/me` read and edit. Admin-only route groups are never gated (admins can't be suspended — see
Non-obvious rationale). `support`, `auth` (including `logout`), and any "my status" read
deliberately stay on bare `requireAuth` so a suspended user can still log out and file an appeal.
Everything else authenticated is still open mid-session to a suspended user — see Follow-ups.

## Non-obvious rationale

- **Admins can't be moderated, by anyone, including themselves.** `assertTargetIsModerable` rejects
  `UserRole.ADMIN` targets outright. This isn't in the source spec this feature was built from — it
  closes an abuse/lockout vector that only exists once this endpoint does.
- **A ban must be lifted by a different admin than the one who imposed it**
  (`findLatestBanActorUserId` reads the most recent `user.banned` `PlatformAuditLog` row for the
  target and compares `actorUserId`). Plain suspensions have no such restriction — any
  platform-access admin can impose or reverse one, including their own. This asymmetry is
  deliberate: suspension is meant to be cheap and reversible, a ban is meant to have one piece of
  built-in friction against a single admin unilaterally imposing and un-imposing it. `Brand` has no
  ban tier at all — only `ACTIVE`/`SUSPENDED` — since the source edge cases this was built from never
  called for one, and suspend/unsuspend already covers "freeze this business."
- **`authRepository.deleteAllRefreshTokensForUser` gained an optional transaction-client
  parameter** (it previously hardcoded the global `prisma` client) specifically so it can run
  inside the same `$transaction` as the status flip — without that, a crash between the two writes
  could leave a suspended account with live refresh tokens.
- **No separate suspension-history table.** `PlatformAuditLog` already records who/when/why/what
  for every admin action; the columns on `User`/`Brand` are just "current state," the same
  relationship `creatorStatus` already has to its own history.
- **A suspended brand's fulfilment/withdraw/profile reads are blocked too, not just writes.**
  `requireBrandId` throws for any caller once the brand isn't `ACTIVE`, including the read paths
  that happen to resolve their brand through it (e.g. listing your own fulfilment groups). This was
  a deliberate simplicity choice — matching how `requireActiveAuth` treats a suspended `User` the
  same way — rather than splitting every brand-scoped function into a read/write-aware variant.
  Revisit if a suspended brand owner needs read-only access to their own history while frozen.
- **Product/creator-look visibility hides via a relation filter, never a bulk write.** A brand's or
  creator's individual `Product`/`CreatorLook` rows are never touched — the public queries just also
  require `accountStatus: ACTIVE` on the joined `brand`/`creator`. One flip on the parent record
  restores everything instantly, and no product's or look's own independent moderation state is
  disturbed.

## Follow-ups (tracked here, not yet built)

- **Finish the `requireActiveAuth` rollout.** Currently wired into `orders`, `cart`, `products`,
  `withdraw`, `chat`/`conversation`, and `brands`' `/me` routes (see Funnel above). Still open:
  `creator-looks` writes (posting, liking, commenting), `brand-bank-accounts`/`brand-payouts` (they
  already inherit the `Brand`-level freeze via `requireBrandId`, but not the `User`-level one).
- **Admin UI.** No `/users` or brand-management list/detail page exists in `apps/admin` yet to drive
  any of this — today these endpoints can only be called directly.
- **Web UI.** `apps/web` has no `ACCOUNT_SUSPENDED` handling yet — no dedicated suspended-account
  screen, no `packages/client` hook for the new error code, no socket listener for
  `SOCKET_EVENTS.ACCOUNT_SUSPENDED`.
