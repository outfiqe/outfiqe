# announcements

## Purpose

Lets moderation staff compose a message, target it at a role-shaped audience (everyone, customers,
approved creators, brand owners, or staff — one or several at once), and deliver it through the
notification system every other feature already relies on — the bell, the socket relay, and push —
instead of a bespoke code path per campaign. Owns the `Announcement`/`AnnouncementAudienceTarget`
tables and the admin-only REST surface; it does not own the `Notification` table itself, which stays
`notifications`' concern.

## Structure

- `announcement.types.ts` — `AnnouncementRecord` (DB shape), `AnnouncementView` (API-response shape:
  ISO date strings plus the live `resolvedAudienceCount`), `CreateAnnouncementInput`/
  `UpdateAnnouncementInput`, `AudiencePage` (one page of matching user ids).
- `announcement.constants.ts` — `ANNOUNCEMENT_SEND_NOW_MAX_RECIPIENTS`/`ANNOUNCEMENT_FANOUT_PAGE_SIZE`
  (both 500, matching `prisma/backfill-notification-targets.ts`'s own batch size), the scheduled-dispatch
  sweep interval, and the `platform-audit` action-string map.
- `announcement.utils.ts` — pure, no DB access: `resolveAudienceWhere` (the five audience segments →
  a `Prisma.UserWhereInput`, always excluding the sending admin), `toAnnouncementRecord`/
  `toAnnouncementView` mappers, `buildAnnouncementMetadata` (the `Notification.metadata` snapshot a
  send fans out — title/body/CTA/expiry, admin-authored rather than computed).
- `announcement.repository.ts` — Prisma access for `Announcement`/`AnnouncementAudienceTarget` only;
  never reaches into `prisma.notification` (see Non-obvious rationale). `findAudiencePage` pages
  through matching `User` rows (`id`-cursor, same idiom as the backfill script's own sweep) — the fan-out
  never loads the whole audience into memory at once. `claimForSending` is the `updateMany`-returns-a-count
  guard against two schedule sweeps (or two API instances) racing the same due row.
- `announcement.service.ts` — `createDraft`/`updateDraft`/`getById`/`list` (draft CRUD, always returning
  a freshly-computed `resolvedAudienceCount`), `send` (branches into "schedule for later" vs "send now",
  the latter capped by `ANNOUNCEMENT_SEND_NOW_MAX_RECIPIENTS`), `cancel`, `runFanOut` (the actual
  paged write, shared by both the immediate-send request and the scheduled-dispatch job).
- `announcement.lifecycle.ts` — `runAnnouncementScheduledDispatch()`: claims and sends every `SCHEDULED`
  row whose time has come, using the shared `settleIds` per-row error isolation
  (`apps/api/src/shared/utils/lifecycle-sweep.utils.ts`) so one bad announcement doesn't block the rest
  of the sweep. Composed into `apps/api/src/jobs/scheduled-jobs.ts`'s `INTERVAL_JOBS`.
- `announcement.schemas.ts` / `announcement.controller.ts` / `announcement.routes.ts` — the REST surface:
  `POST /` (draft), `PATCH /:id` (edit a draft), `GET /` (cursor-paginated, status-filterable), `GET /:id`,
  `POST /:id/send` (`{ scheduledAt? }`), `POST /:id/cancel`.

## Funnel

**User-facing:** an admin with access to Announcements composes a title, body, and audience, saves it
as a draft (seeing a live "resolves to ~N people" estimate), and either sends it immediately or
schedules it. Every matching user sees an ordinary card in their notification bell — same read/unread
model, same bell/panel, same push behavior as a like or an order update — with an optional tap-through
to an internal page or an external link.

**Technical:** `announcement.routes.ts` → `announcement.controller.ts` → `announcement.service.ts` →
`announcement.repository.ts` → Postgres. A send (immediate or scheduled-dispatch) calls
`announcementService.runFanOut`, which pages through the resolved audience and, per page, calls
`notificationService.notifyBroadcast` (in `notifications`, not here) — the module boundary is: this
module decides _who_ and _what_, `notifications` owns _how a notification row gets written and
delivered_.

## Non-obvious rationale

**This module never calls `prisma.notification.*` directly, and never calls
`notifyIndividual`/`notifyManyIndividual` either.** The `Notification` table is `notifications`'
concern, and its existing per-row write path is built for social-action fan-outs (a handful to a few
hundred recipients), not a send that can span the whole user base. Rather than either violate the
module boundary or force-fit an unbounded loop through a one-row-at-a-time API, `notifications` gained
one new bulk primitive, `notificationService.notifyBroadcast` — chunked at this module's own paging
boundary, mute-checked in one batch query, and still handing off through the same
`DomainEvents.NOTIFICATION_CREATED` → socket-relay → push pipeline every other type uses.

**`audiences` is a child table (`AnnouncementAudienceTarget`), not a Postgres scalar array column.**
Checked every `[]` field already in `schema.prisma` before adding this one — all of them are relation
lists; there is no precedent anywhere in this schema for a native array column. `CouponEligibility`
(`coupons`) is the established shape for "one record needs a small set of enum tags," and this mirrors
it exactly.

**The audit trail (`platform-audit`, not `crm-audit` — this is a platform-wide action, not a tenant's
own) is recorded entirely from `announcement.service.ts`, not the controller**, unlike the
controller-side convention `support`/`crm-access` follow. A scheduled announcement's actual send can
happen a week later inside the lifecycle job, with no `req`/`res` at all — recording "sent" anywhere
but the shared `runFanOut` would silently miss every scheduled send. Once that one record has to live in
the service, `scheduled`/`canceled` stay there too rather than splitting the module's audit calls across
two layers depending on which action fired.

**A resolved audience always excludes the sending admin**, applied the same way regardless of which
segments are selected — not special-cased to "Everyone" the way the original PRD framed it. It's a
no-op for a segment the admin isn't in anyway, and avoids a second policy to explain.

**Gated by the platform-nav-access system (`requirePlatformNavItem("announcements")` +
`platform:announcements:manage`), not a flat `requireRole(ADMIN)`.** Every other sensitive, mass-impact
admin surface in this codebase (`coupons`, `withdraw-requests`, `financial-rollup`, `team`) already
works this way, so co-founders can restrict who gets to broadcast to the whole platform through the
existing Navigation access screen — a flat role check would have made that impossible for this one
feature alone.

**`expiresAt` is compared against the actual send time, not the compose time.** A scheduled
announcement's `expiresAt` is checked against `scheduledAt` (or "now" for an immediate send) at the
moment `send` is called, not when the draft was first saved — an announcement composed today and
expiring next week can still be scheduled for two weeks out and correctly rejected.
