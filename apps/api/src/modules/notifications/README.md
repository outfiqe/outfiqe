# notifications

## Purpose

The in-app notification system: a durable, real-time side effect of the domain events other
modules already publish (likes, follows, comments, achievements, orders, brand applications).
Owns the `Notification`/`NotificationPreference` tables, the write-path consumer that turns a
domain event into a notification row, the REST read path, and the Socket.IO relay that pushes new
activity to an open bell/panel live.

## Structure

- `notification.constants.ts` — `GROUPABLE_NOTIFICATION_TYPES` (the three types plan §4 collapses
  repeat activity into one row for: `LOOK_LIKED`, `NEW_FOLLOWER`, `NEW_BRAND_FOLLOWER`),
  `MAX_RECENT_ACTORS` (3, the avatar-stack cap), `NOTIFICATION_CONSUMER_GROUP`/
  `NOTIFICATION_SOCKET_CONSUMER_GROUP` (the two independent Redis Streams consumer groups this
  module registers — write path and socket relay), `CRITICAL_RETENTION_NOTIFICATION_TYPES` +
  `STANDARD_READ_RETENTION_DAYS`/`CRITICAL_READ_RETENTION_DAYS` (chunk 10's retention job reads
  these), `NOTIFICATION_GROUP_KEYS` (the three `groupKey` builders — see rationale below).
- `notification.types.ts` — `NotificationRecord` (the service/repository-level shape, `metadata`
  parsed to `NotificationMetadata`, not raw `Json`), `NotificationActorSnapshot` (the denormalized
  actor fields stored in `metadata`), `CreateIndividualNotificationInput`/`UpsertGroupInput`/
  `RetractGroupActorInput` (the three write shapes the service accepts).
- `notification.utils.ts` — pure functions only, no DB access: `toNotificationRecord`/
  `toBroadcastPayload` (row ↔ record ↔ socket-payload mapping), `mergeRecentActors`/
  `removeRecentActor` (the capped, deduped, most-recent-first actor list join/leave a group).
- `notification.repository.ts` — Prisma queries only. `createIndividual` (plain insert, ungrouped
  types) and `upsertGroup`/`retractGroupActor` (the race-safe grouped write/retraction — see
  rationale below) own the `notifications` table's write side; `findMutedRecipientIds` reads
  `notification_preferences`. The rest are small, single-purpose cross-module reads the write path
  needs to build a denormalized `metadata` snapshot or resolve a fan-out recipient list
  (`findActorSnapshot`, `findLookSnapshot`, `findBrandMemberIds`,
  `findOrderNotificationContext`, `findProductReviewSnapshot`, `findDeliveredOrderProducts`) —
  kept here rather than added to each producing module's own repository, since "who should this
  notification go to and what should it show" is this module's concern, not theirs.
- `notification.service.ts` — `notifyIndividual`/`notifyManyIndividual`/`notifyGroup`/
  `retractGroupActor`: the mute-check + write + realtime-handoff orchestration every event handler
  calls into. Never called directly by another module — only by `notification.events.ts`.
- `notification.events.ts` — `registerNotificationEventConsumers()`: one domain-event handler per
  row in plan §5's event catalog, each resolving the right recipient(s), building the denormalized
  `metadata` snapshot, and calling into `notification.service.ts`. A second, independent consumer
  group from every other module already subscribed to the same streams (`xp.events.ts`,
  `achievement.events.ts`) — Redis Streams consumer groups don't interfere with each other.
  `DomainEvents.WITHDRAW_REQUEST_STATUS_CHANGED` (published by `withdraw/withdraw.service.ts` on a
  final approval, a rejection, and a mark-paid) is handled the same way: the handler maps the
  event's `status` to a `NotificationType` via `WITHDRAW_REQUEST_NOTIFICATION_TYPES` and no-ops on
  any status not in that map (`PENDING`/`UNDER_REVIEW`, which are never published in the first
  place).
- `notification.socket.ts` — `registerNotificationSocketEventConsumer()`: the `socket-broadcast`
  relay for `NOTIFICATION_CREATED`/`NOTIFICATION_UPDATED` (see Funnel below).
- `notification.schemas.ts` / `notification.controller.ts` / `notification.routes.ts` — the REST
  read path, all `requireAuth`-only and scoped to `req.user.id` (never a client-supplied
  recipient). Static/prefixed paths (`/unread-count`, `/preferences`, `/read-all`) are registered
  before the `/:id`-shaped routes, same convention as `creator-looks`/`orders`, so Express doesn't
  swallow them: `GET /` (cursor-paginated feed), `GET /unread-count`, `PATCH /:id/read` (404s for a
  notification that isn't the caller's, same as any other id-not-found — never a distinguishable
  403, which would leak that the id exists), `PATCH /read-all` (idempotent), plus the mute
  preferences pair `GET /preferences` / `PATCH /preferences/:type`.
- `notification.retention.ts` — `runNotificationRetentionSweep()`: deletes read notifications past
  their retention window (`STANDARD_READ_RETENTION_DAYS`/`CRITICAL_READ_RETENTION_DAYS`, plan §13's
  answer). Composed into `apps/api/src/jobs/scheduled-jobs.ts`'s `INTERVAL_JOBS` (daily), same
  pattern as `commissions/commission.lifecycle.ts`'s sweep — the logic lives in the owning module,
  `src/jobs/` only lists it.

## Funnel

**Technical:** a producing module publishes a domain event it already publishes for its own
reasons (`LOOK_LIKED`, `USER_FOLLOWED`, `ACHIEVEMENT_UNLOCKED`, ...) → `notification.events.ts`
picks it up on its own consumer group, resolves who should be notified and fetches whatever
display context that type needs (actor name/avatar, look thumbnail, ...) → the write lands via
either `notificationRepository.createIndividual` (a plain insert) or `upsertGroup` (the
partial-unique-index-backed race-safe merge, plan §4) → the resulting row's real post-write state
publishes `DomainEvents.NOTIFICATION_CREATED`/`NOTIFICATION_UPDATED`, a second internal domain
event a completely independent socket-relay consumer subscribes to (chunk 4) — the same two-step
handoff `xp.service.ts` → `xp.socket.ts` already uses for `LEVEL_UP`, done so the socket payload
never has to be recomputed (and potentially race) against a second, independent read of the same
row.

**User-facing:** a bell + panel (`packages/components`, chunk 8) mounted once and reused across
`apps/web` (creator, business, and any authenticated customer — see the `ORDER_STATUS_CHANGED`
note below) and `apps/admin`. The REST surface (`notification.controller.ts`) is the reconciliation
path — pagination, initial load, and the safety net when a socket event is missed — not the
primary delivery mechanism.

## Non-obvious rationale

**`createIndividual`/`upsertGroup` return `null` instead of throwing on a foreign-key
violation.** A domain-event consumer group replays its entire stream history from the
beginning the first time it's created (`XGROUP CREATE ... "0"`), which can hand this module a
`recipientId`/`actorId` for a user that's since been deleted. The raw-SQL path in `upsertGroup`
doesn't get Prisma's `P2003` code (only ORM-generated queries do), so `isRawForeignKeyViolation`
matches on the constraint text Postgres itself reports instead of a Prisma error code. Both call
sites in `notification.service.ts` treat a `null` return as "nothing to broadcast," not an error.

**`upsertGroup` hand-writes `INSERT ... ON CONFLICT (...) WHERE ... DO NOTHING` rather than a
plain `create()` wrapped in a caught `P2002`.** A caught unique-violation from `create()` still
happened as a real Postgres error inside the surrounding `prisma.$transaction` — Postgres aborts
the whole transaction on any statement error, not just the one call, so every later query in that
same transaction (the `SELECT ... FOR UPDATE` fallback) would fail with "current transaction is
aborted" even though the JS `catch` looks like it recovered. `INSERT ... ON CONFLICT ... DO
NOTHING` is the one write Postgres resolves without raising an error at all, which is exactly why
the plan calls for raw SQL here specifically — this is a real correctness requirement, not a style
preference.

**`BRAND_APPLICATION_APPROVED`/`REJECTED` are not part of this module.** A brand applicant has no
`User` row at all until they register through the invite token issued on approval (see
`brand-applications/README.md` and `BRAND_OWNER_REGISTERED`) — there is no `recipientId` to write
a `Notification` against at review time. The existing `brandApprovedTemplate`/
`brandRejectedTemplate` emails already cover that step; only `BRAND_APPLICATION_SUBMITTED`
(recipient: admins, who do have accounts) is wired here.

**`ORDER_STATUS_CHANGED`'s recipient is the order's buyer, not a creator/business role** — the one
notification type any authenticated customer can receive regardless of `isCreator`/`role`. The
bell therefore mounts for every authenticated user on `apps/web`, not just creators/businesses.

**`REVIEW_REQUESTED` piggybacks on the existing `ORDER_STATUS_CHANGED` handler instead of a new
domain event.** `product-reviews` doesn't own a consumer file of its own — the order module
already publishes `ORDER_STATUS_CHANGED` with the new `DELIVERED` status on every delivery, so this
module's existing handler additionally fans out one `REVIEW_REQUESTED` notification per distinct
product in that order (`findDeliveredOrderProducts`), deep-linking to that product's review section
on the web product page. `PRODUCT_REVIEWED` (a review's target product owner being notified) is a
genuine new domain event, `DomainEvents.PRODUCT_REVIEWED`, published by `product-reviews.service.ts`
after a review is created — resolved to every `BrandMembership` row for that product's brand, same
fan-out `PRODUCT_PURCHASED` → `NEW_ORDER` already does.

**Self-actions never notify.** Every handler that has both an actor and a recipient skips the
write when they're the same user (liking/commenting/following your own content, or — impossible
today, but guarded anyway — a brand owner "following" their own brand). Matches the same
self-exclusion `xp/xp.events.ts` already applies to `LOOK_LIKE_RECEIVED`/`LOOK_COMMENT_RECEIVED`.

**`NEW_FOLLOWER` only fires when the followed user is an approved creator**, mirroring
`xp/xp.events.ts`'s own `isApprovedCreator` check on the same `USER_FOLLOWED` event — duplicated
here rather than shared, matching that module's own precedent for why this predicate stays
module-local (see `xp/README.md`).

**Group keys don't need to be scoped to the recipient inside the string.** The partial unique
index is `(recipient_id, group_key) WHERE is_read = false`, so `NOTIFICATION_GROUP_KEYS.newFollower()`
returning a bare constant (`"new-follower"`) is still a distinct DB row per recipient — the index's
own composite key does that scoping, not the string.

**Retracting the last actor from a group (unlike bringing `actorCount` to zero) deletes the row
outright and does not publish a live socket update.** Plan §6 only defines `notification:created`
and `notification:updated` — there is no "remove this card" event, and inventing one wasn't asked
for. A currently-open panel showing a like-group that gets fully unliked will show a stale card
until the next REST fetch (panel reopen, pagination, or the existing reconnect-sync path) —
accepted as a narrow, self-healing gap consistent with this build's own "resilience" bar (plan
§10: "a missed live event self-heals within one interaction"), not a silent oversight.

**Retention is two-tiered, and unread rows are exempt from both tiers.** Read notifications for
money/business-decision types (`NEW_ORDER`, `ORDER_STATUS_CHANGED`, `COMMISSION_EARNED`,
`BRAND_APPLICATION_SUBMITTED`) live 180 days; every other read type lives 90. An unread
notification is never deleted regardless of age — the sweep's delete always requires `isRead:
true`, so a user who never opens the panel doesn't silently lose activity they haven't seen yet.

**Notification preferences are opt-out, not opt-in.** No `NotificationPreference` row for a
`(userId, type)` pair means that type is enabled — most users will never have any rows here at
all. `findMutedRecipientIds` is the only read on the in-app path; a missing row is never treated
as "muted." `GET /preferences` returns every `NotificationType` value (not filtered by the
caller's role) — toggling a type that could never apply to that user (e.g. a plain customer
muting `NEW_ORDER`) is harmless, and skipping per-role filtering avoids a second "which types
apply to which surface" classification that would have to be kept in sync with the frontend's own
per-app type usage.

**`pushEnabled` is a second channel on the same row, read only by the `push` module.** The row
carries `enabled` (in-app) and `pushEnabled` (phone), both defaulting to true. The in-app path
still only looks at `enabled`. The push module's `isPushMutedForType` reads `pushEnabled` so
someone can keep a like showing in the bell but stop it buzzing their phone. The HTTP surface to
toggle `pushEnabled` per type lands with the push settings UI; until then it is true for
everyone, so push follows the browser permission alone.

**`notification:read`/`notification:read-all` are emitted directly from `notification.service.ts`
(`getIO().to(userRoom(...)).emit(...)`, wrapped in the same try/catch as every other socket emit
in this codebase), not published onto the domain-event bus.** Unlike a notification's creation —
a side effect of an unrelated request (a like, a follow) that genuinely needs Redis Streams'
retry/dead-letter durability — marking as read is already a synchronous, first-class action inside
its own request. Routing it through the event bus would add a redundant durability guarantee (and
a real, if small, delivery-order/latency cost) for a signal whose only job is syncing other open
tabs of the same user, which the REST response itself already confirms succeeded.

**Coverage note:** `notification.events.ts` and `notification.socket.ts` are intentionally left
out of `vitest.config.ts`'s `coverage.include` — matching the same convention `xp.events.ts`/
`xp.socket.ts` and `achievement.events.ts`/`achievement.socket.ts` already follow (only the pure
`.utils.ts` files are gated). These are thin consumer-registration wiring with no meaningful unit
boundary short of standing up a real Redis Streams round-trip, which no consumer module in this
codebase currently does in tests; `notification.service.integration.test.ts` exercises the same
write logic these handlers call into directly against a real DB instead.
