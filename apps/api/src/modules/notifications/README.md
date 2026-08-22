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
  `findOrderNotificationContext`) — kept here rather than added to each producing module's own
  repository, since "who should this notification go to and what should it show" is this module's
  concern, not theirs.
- `notification.service.ts` — `notifyIndividual`/`notifyManyIndividual`/`notifyGroup`/
  `retractGroupActor`: the mute-check + write + realtime-handoff orchestration every event handler
  calls into. Never called directly by another module — only by `notification.events.ts`.
- `notification.events.ts` — `registerNotificationEventConsumers()`: one domain-event handler per
  row in plan §5's event catalog, each resolving the right recipient(s), building the denormalized
  `metadata` snapshot, and calling into `notification.service.ts`. A second, independent consumer
  group from every other module already subscribed to the same streams (`xp.events.ts`,
  `achievement.events.ts`) — Redis Streams consumer groups don't interfere with each other.

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
note below) and `apps/admin`.

## Non-obvious rationale

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

**Notification preferences are opt-out, not opt-in.** No `NotificationPreference` row for a
`(userId, type)` pair means that type is enabled — most users will never have any rows here at
all. `findMutedRecipientIds` is the only read; a missing row is never treated as "muted."
