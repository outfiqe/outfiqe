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
  `PLATFORM_STAFF_NOTIFICATION_PERMISSIONS` and `TENANT_STAFF_NOTIFICATION_PERMISSIONS` are the
  notification rules: for each staff notification type, the permissions whose holders receive it.
  Adding a staff notification means adding one entry here.
- `notification.types.ts` — `NotificationRecord` (the service/repository-level shape, `metadata`
  parsed to `NotificationMetadata`, not raw `Json`), `NotificationActorSnapshot` (the denormalized
  actor fields stored in `metadata`), `CreateIndividualNotificationInput`/`UpsertGroupInput`/
  `RetractGroupActorInput` (the three write shapes the service accepts).
- `notification.utils.ts` — pure functions only, no DB access: `toNotificationRecord`/
  `toBroadcastPayload` (row ↔ record ↔ socket-payload mapping), `mergeRecentActors`/
  `removeRecentActor` (the capped, deduped, most-recent-first actor list join/leave a group),
  `buildNotificationDedupeKey` (event id + type + entity id, see the retry note below).
- `notification.targets.ts` — `resolveNotificationTarget({ type, entityId, metadata,
recipientIsStaff })`: pure, the single place that decides where a notification click lands.
  Returns `{ surface: "WEB" | "ADMIN", path }` or `null`. The repository calls it on every write
  and persists the result onto the row (`target_surface` / `target_path`), so the destination is
  computed once — where the recipient's context is known — instead of re-guessed by each client.
  Clients read those two fields and just navigate; each app treats the other surface's target as a
  cross-origin full-page navigation. `recipientIsStaff` is passed by the two support-reply
  handlers whose recipient can be either the customer or an agent. `CRM_ITEM_ASSIGNED` is the one
  `ADMIN`-surface target that also needs to cross a _tenant_ boundary, not just an app boundary —
  see Non-obvious rationale.
- `notification.repository.ts` — Prisma queries only. `createIndividual` (plain insert, ungrouped
  types) and `upsertGroup`/`retractGroupActor` (the race-safe grouped write/retraction — see
  rationale below) own the `notifications` table's write side; `findMutedRecipientIds` reads
  `notification_preferences`. The rest are small, single-purpose cross-module reads the write path
  needs to build a denormalized `metadata` snapshot or resolve a fan-out recipient list
  (`findActorSnapshot`, `findLookSnapshot`, `findBrandMemberIds`,
  `findOrderNotificationContext`, `findProductReviewSnapshot`, `findDeliveredOrderProducts`) —
  kept here rather than added to each producing module's own repository, since "who should this
  notification go to and what should it show" is this module's concern, not theirs.
  `upsertSystemReminder` is the actor-less counterpart of `upsertGroup` — a recipient-keyed
  grouped row (find-unread-by-`groupKey` then update-or-create in one transaction) for
  system-generated digests that have no acting user, with `metadata` merged so a repeated sweep
  refreshes a count in place.
- `notification.service.ts` — `notifyIndividual`/`notifyManyIndividual`/`notifyGroup`/
  `retractGroupActor`/`notifySystemReminder`: the mute-check + write + realtime-handoff
  orchestration every event handler calls into. Never called directly by another module — only by
  `notification.events.ts`. `notifySystemReminder` is the digest path (see `PRODUCT_TAG_REVIEW_REMINDER`).
  `notifyPlatformStaff` and `notifyTenantStaff` send a staff notification to everyone in that
  organization whose role holds the rule's permissions (plus the owner, minus the actor), and tag
  each row with the organization. `notifyPlatformStaffMember` does the same for one named staff
  member, such as the assigned support agent. `clearOrganizationNotificationsFor` removes one
  organization's notifications from a person's bell.
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
  preferences pair `GET /preferences` / `PATCH /preferences/:type`. The feed, unread count and
  read-all accept `?scope=all|tenant` (see the tenant bell note below).
- `notification.middleware.ts` — `resolveTenantForTenantScope`: runs `resolveTenant` only when the
  request asks for `scope=tenant`.
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

- **Staff notifications go to permission holders, never to every admin account.** Brand
  applications notify holders of `platform:brands:manage`, support requests notify holders of
  `platform:support:respond` or `platform:support:manage`, and coupon approvals, flagged
  redemptions and budget alerts notify holders of `platform:coupons:manage`
  (`platformAccessService.findUserIdsHoldingAnyPermission`). Co-founders and the platform super
  admin are always included. Tenant staff never receive these, because they have no
  platform-organization membership.

**The click destination is authored server-side, not by the client.** A notification stream
mixes platform-wide (`NEW_MESSAGE`), creator, brand, and staff events, and where a recipient
should land depends on their role/capabilities and which app they're in — context only the write
path has. So `resolveNotificationTarget` runs on every write and `target_surface`/`target_path`
are stored on the row (grouped rows re-resolve on each `upsertGroup` update, since a
follow target follows the latest follower). Both `NEW_FOLLOWER` and `NEW_BRAND_FOLLOWER` point
at the follower's own page: `/creator/<handle>` if the follower has an approved public creator
profile, else `/brand/<brandId>` if they own a brand, else the recipient's own `/profile` —
`findActorSnapshot` denormalizes an `isCreator` flag and a `brandId` onto the actor for exactly
this three-way check (`/creator/<handle>` 404s for a non-creator, so a plain shopper who owns no
brand is the only case that falls through to `/profile`). Clients navigate to the stored path
and delete their own type→route guessing.

**`CRM_ITEM_ASSIGNED` resolves to an absolute, tenant-qualified URL, not a bare admin path.**
`apps/admin`'s CRM area resolves its organization from the _request's hostname_
(`resolveTenant` in `crm-access.middleware.ts`), not from the viewer's own membership — a plain
`/crm/tasks` router link only lands on the right tenant's data if the recipient happens to already
be on that tenant's subdomain when they click it, which is not guaranteed (a CRM member can belong
to more than one tenant, or be browsing the platform's own host, or a different tenant's subdomain,
at the time). `notification.events.ts`'s `CRM_ITEM_ASSIGNED` consumer looks up the assigning
organization's `subdomain`/`isPlatformOrg` and stores them on the notification's `metadata`;
`resolveNotificationTarget` then builds the link with `crm-access`'s `buildOrganizationAdminUrl` —
the same helper the billing return-URL and invite/ownership-transfer emails already use for this
exact problem — instead of the bare relative path. `AdminNotificationBell` needed no change: it
already treats any `target_path` starting with `http(s)://` as external and opens it in a new tab
(`isExternalNotificationPath`, from `@outfiqe/utils`), the same path an `ANNOUNCEMENT`'s explicit
`announcementTargetPath` already takes — `CRM_ITEM_ASSIGNED` just never populated the field that
would trigger it. A click always opens in a new tab now, even when the recipient happens to
already be on the right subdomain, because the write path can't know that in advance; correctness
(never showing the wrong tenant's board) outweighs occasionally opening a tab that wasn't strictly
needed.

`target_path` is a cache, and it goes stale when the resolver or the denormalized metadata it
reads changes — a row written before `isCreator`/`brandId`/`lookOwnerHandle` were added keeps
whatever path was computed at write time (e.g. a brand-owner follow frozen at `/creator/<handle>`
→ 404, a "followed your brand" frozen at `/profile`, or a comment reply frozen at `/profile`).
Two mitigations: (1) the web bell recomputes `NEW_FOLLOWER`, `NEW_BRAND_FOLLOWER` and
`COMMENT_REPLIED` from the current client resolver instead of trusting the stored path — those
targets are role-free and fully client-computable, and an old row with no `isCreator`/`brandId`/
`lookOwnerHandle` in metadata degrades to `/profile` rather than a 404; (2)
`prisma/backfill-notification-targets.ts` (`pnpm db:backfill:notification-targets`, or the
`Backfill notification targets` workflow) re-hydrates the actor `isCreator`/`brandId` flags and
the look owner handle from the live tables and recomputes `target_surface`/`target_path` for
every row — run it once after any release that changes target resolution, so push URLs (which
have no client recompute) are corrected too. `push.messages.ts` uses `target_path` for a
web-surface notification and falls back to its own `urlFor` otherwise.

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

**`PRODUCT_TAG_SUBMITTED` fans out to brand members and groups per brand**, same shape as
`BRAND_FOLLOWED` → `NEW_BRAND_FOLLOWER`: `findBrandMemberIds` + a `notifyGroup` per member keyed on
`NOTIFICATION_GROUP_KEYS.tagReviewQueue(brandId)`, so a brand sees one "N creators have tags
waiting" row with an avatar-stack, not one row per pending tag. The creator is the actor.
`PRODUCT_TAG_APPROVED` / `PRODUCT_TAG_REJECTED` / `PRODUCT_TAG_REVOKED` go to the creator as plain
individual notifications; reject/revoke carry the brand's `reason` + `note` in `metadata`
(`tagRejectionReason`/`tagRejectionNote`) so the bell text shows the brand's own words. Approve
carries `tagAutoApproved` so the copy can say "auto-approved" for an SLA/policy approval vs "a
brand approved" for a manual one. `PRODUCT_TAG_REVIEW_REMINDER` is the digest row: `../tag-reviews`'
scheduled job publishes `TAG_REVIEW_REMINDER_DUE` per brand with a standing backlog, and this
consumer fans it out to brand members via `notifySystemReminder` — an actor-less grouped upsert
(`upsertSystemReminder`) keyed on `NOTIFICATION_GROUP_KEYS.tagReviewReminder(brandId)`, so a brand
carries one "N tags still waiting for your review" row whose `pendingTagReviewCount` is refreshed
in place on each sweep rather than stacking a new row per run.

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

**`updatedAt` is the notification's activity time, not "the row last changed".** The bell shows
it and the feed is sorted by it. So it moves only when something new happens: a row is created, a
group gains or loses a person, or a reminder's count is refreshed. It does not move when a
notification is marked read. It used to be a Prisma `@updatedAt`, which moved on every write. That
made a notification opened today show "1m ago" and jump to the top, even if it was sent days
earlier. Every write that counts as new activity now sets `updatedAt` itself. Migration
`20260926130000_notification_activity_time` reset the times that marking read had already moved,
for rows with no `groupKey`. Those rows are only ever changed by marking read, so their creation
time is their true activity time.

**Platform and tenant staff notifications go through one set of rules.** The platform is itself
an organization with members and roles, so "platform staff who can manage brands" and "tenant
staff who can manage billing" are the same question. The two rule lists in
`notification.constants.ts` answer it. Both `notifyPlatformStaff` and `notifyTenantStaff` use
`crmAccessRepository.findActiveMemberUserIdsHoldingAnyPermission`, which always includes the
owner (and, for the platform, co-founders). The person who caused the event is never notified.
Every staff notification is tagged with its organization. Platform ones carry the platform
organization, so removing someone from the platform team clears them too, and a tenant's bell never
shows them. The billing renewal email uses the same lookup, so the email and the bell always reach
the same people.

Tenant staff notifications today:

| Event                                                                   | Notification                                              | Who gets it      |
| ----------------------------------------------------------------------- | --------------------------------------------------------- | ---------------- |
| A ticket is created with no one assigned (`CRM_TICKET_CREATED`)         | `CRM_TICKET_UNASSIGNED`                                   | `tickets:manage` |
| Someone accepts an invite (`CRM_MEMBER_JOINED`)                         | `CRM_MEMBER_JOINED`                                       | `members:manage` |
| A renewal invoice opens (`CRM_INVOICE_OPENED`)                          | `CRM_INVOICE_DUE`                                         | `billing:manage` |
| A subscription goes past due or is canceled (`CRM_SUBSCRIPTION_LAPSED`) | `CRM_SUBSCRIPTION_PAST_DUE` / `CRM_SUBSCRIPTION_CANCELED` | `billing:manage` |

Letting admins choose which roles get which notification, and muting a type for one tenant only,
are planned for when tenants ask for them. The rule lists are the defaults a per-organization
setting would override, so neither needs this design changed.

**A retried event never sends the same notification twice.** Redis Streams redelivers an event
whose handler failed partway, for example after notifying half the recipients. Each handler passes
the event's id (`sourceEventId`, from the consumer's `{ eventId }` context), and
`createIndividual` stores `buildNotificationDedupeKey(eventId, type, entityId)` in `dedupe_key`.
A unique index on `(recipient_id, dedupe_key)` makes the database refuse the second copy, and the
repository treats that refusal as "already sent". Rows written without an event id (announcements,
tests) have no key, and a unique index allows any number of those.

**Losing access to an organization clears its notifications.** `crm-access` publishes
`CRM_MEMBERSHIP_ENDED` when a membership is deactivated, or when the previous owner is removed
after an ownership transfer. The handler deletes that organization's notifications from the
person's bell. Reactivating someone does not bring them back.

**The staff permission check happens once, when a notification is sent.** Before role-based
platform access existed, the staff notifications listed at the top of this section went to every
admin account, so a support-only person could hold a brand application. Migration
`20260926130000_notification_activity_time` deleted those leftovers wherever the recipient does not
hold the matching permission today. If someone's role later loses a permission, notifications they
already received stay in their bell. Opening one lands on a page that shows the "no access" screen,
so nothing is exposed.

**A tenant's admin bell shows only that tenant's notifications.** A row written for one
organization's CRM carries `organizationId` (today only `CRM_ITEM_ASSIGNED` sets it). `GET /`,
`GET /unread-count` and `PATCH /read-all` take `?scope=tenant`. With it,
`notification.middleware.ts`'s `resolveTenantForTenantScope` runs the same host-based
`resolveTenant` the CRM routes use, and the query keeps only rows for that organization. It fails
closed: an unknown tenant host is a 404, never the unfiltered feed. Without a scope, or with
`scope=all`, the feed is unchanged, so the storefront and the platform admin still see everything.
Filtering only narrows the caller's own rows, so no membership check is needed. A scoped
`read-all` sends `organizationId` in its `notification:read-all` socket payload. Other open bells
then mark only that tenant's cards read and refetch their count, instead of clearing everything.
Storefront notifications (likes, orders, messages) stay in the storefront bell. Before this, the
tenant bell showed them and sent the click to the main domain.

**Retention is two-tiered, and unread rows are exempt from both tiers.** Read notifications for
money/business-decision types (`NEW_ORDER`, `ORDER_STATUS_CHANGED`, `COMMISSION_EARNED`,
`BRAND_APPLICATION_SUBMITTED`) live 180 days; every other read type lives 90. An unread
notification is never deleted regardless of age — the sweep's delete always requires `isRead:
true`, so a user who never opens the panel doesn't silently lose activity they haven't seen yet.

**Notification preferences are opt-out, not opt-in.** No `NotificationPreference` row for a
`(userId, type)` pair means that type is enabled — most users will never have any rows here at
all. `findMutedRecipientIds` is the only read on the in-app path; a missing row is never treated
as "muted." `GET /preferences` leaves out staff notification types the caller can never
receive. It checks the same rule lists delivery uses (`canReceiveNotificationType`, with
`PLATFORM_STAFF_ONLY_NOTIFICATION_PERMISSIONS` for platform staff types and
`TENANT_STAFF_NOTIFICATION_PERMISSIONS` for tenant ones), so a shopper never sees "New brand
applications" and a billing manager sees billing alerts but not ticket alerts. Personal
notification types stay listed for everyone. `SUPPORT_TICKET_REPLY` counts as personal, because
customers receive it too. Adding a staff type to a rule list updates the mute list automatically.

**`pushEnabled` is a second channel on the same row, read only by the `push` module.** The row
carries `enabled` (in-app) and `pushEnabled` (phone), both defaulting to true. The in-app path
still only looks at `enabled`. The push module's `isPushMutedForType` reads `pushEnabled` so
someone can keep a like showing in the bell but stop it buzzing their phone.

`PATCH /preferences/:type` takes `enabled`, `pushEnabled`, or both in one request — at least one
is required, enforced by a Zod `refine` rather than leaving an empty body to silently no-op.
`GET /preferences` now returns both fields per type. `NotificationPreferencesView`
(`packages/components`) renders the phone column only when the caller passes
`showPushChannel={true}`, which `apps/web` does once a browser has an active push subscription —
so admin, and any web session that hasn't turned push on yet, still sees the single in-app
column it always has, unaffected by this.

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
