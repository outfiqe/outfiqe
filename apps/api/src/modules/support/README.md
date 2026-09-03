# support

## Purpose

Outfiqe's own first-party support desk: a signed-in shopper, creator or brand raises a request
from the site, platform staff triage and reply from the admin console, every customer-visible
reply is emailed to the requester, and the assigned team is notified in the admin bell on create,
assignment and customer reply.

This is **not** `crm-tickets` — that module is a CRM _tenant's_ support desk, scoped to an
`Organization` and a `Customer`/`Partner`. This module is the platform's, scoped to a `User`.

## Structure

- `support.constants.ts` — `ALLOWED_SUPPORT_TRANSITIONS` (the status state machine),
  `formatReference`/`parseReference` (`OFQ-1042` &harr; `ticketNumber`), rate-limit windows, the
  reopen-token TTL, and `SUPPORT_PERMISSION` (the three `platform:support:*` keys).
- `support.types.ts` — `SupportTicketRecord`, `SupportMessageRecord`, `SupportTicketWithThread`,
  `CreateSupportTicketInput`, filter/stats shapes.
- `support.schemas.ts` — Zod for the public create/reply bodies, the admin action bodies (reply
  with `visibility`, status with an `expectedStatus` for optimistic concurrency, assignee,
  priority) and the admin list query.
- `support.repository.ts` — Prisma CRUD + the `toSupportTicketRecord` mapper (derives `reference`
  from `ticketNumber`, flattens the assignee/brand names). `transitionStatus` is a
  status-guarded `updateMany` that stamps/clears `resolvedAt`, so a concurrent status change
  loses cleanly. `listForAdmin`/`listForRequester` are cursor-paginated; requester reads are
  scoped in the `where` and only return `PUBLIC` messages.
- `support.service.ts` — segment resolution from the account (`BRAND_OWNER` &rarr; `BRAND`,
  approved creator &rarr; `CREATOR`, else `SHOPPER`), the transition-legality check, the domain
  events, and all outbound email.
- `support.controller.ts` / `support.routes.ts` — `/api/support`. Requester routes are behind
  `requireAuth` + a per-user rate limit; admin routes behind `requirePlatformRole(<key>)` and
  every admin mutation writes a `platformAudit` entry.
- `support.emails.ts` templates live in `#email-templates/templates.ts` alongside every other
  transactional template (`supportRequestReceivedTemplate`, `supportStaffReplyTemplate`,
  `supportResolvedTemplate`).
- `support.rate-limit.ts` — `supportCreateRateLimit` (5 / 24h per user) and `supportReplyRateLimit`.
- `support.lifecycle.ts` — `runSupportAutoCloseSweep`, wired into `src/jobs/scheduled-jobs.ts`:
  closes `RESOLVED` requests older than 14 days and clears their reopen token.
- `support.integration.test.ts` — the forward-only lifecycle + stamps, the guarded transitions,
  requester isolation, admin key-gating, the assignment event, and the reopen token.

## Funnel

**User-facing:** a signed-in user opens the request form (`/help`, `/contact`, an order page, or
`/settings/support`), picks a category, and submits. They get an acknowledgement email with the
`OFQ-…` reference and can follow the thread under Settings &rsaquo; Support. A staff reply arrives
by email; replying (in the account or, later, by email) reopens the request. A resolved request
carries a 14-day reopen link.

**Technical:** `support.routes` &rarr; `requireAuth` / `requirePlatformRole` &rarr; controller
&rarr; service &rarr; repository &rarr; Postgres, plus `eventBus.publish` on create / assign /
reply / resolve. The notification consumers in `notifications/notification.events.ts` turn those
events into `Notification` rows (all `UserRole.ADMIN` on create; the assignee on assign; the
requester on a staff reply / resolve).

## Non-obvious rationale

- **The status lifecycle is a declared state machine, not free-form** — `ALLOWED_SUPPORT_TRANSITIONS`
  lists the legal next states (`NEW &rarr; OPEN &rarr; WAITING_ON_CUSTOMER &rarr; RESOLVED &rarr;
CLOSED`, with reopen paths). An illegal jump is `409 INVALID_SUPPORT_TRANSITION`; a lost race is
  `409 SUPPORT_STATUS_CHANGED`. Same shape as `crm-tickets` and `orders` fulfilment.
- **`reference` is derived, not stored** — the model has `ticketNumber Int @unique
@default(autoincrement())`; the human `OFQ-1042` is computed in the mapper. Search-by-reference
  parses the integer back out.
- **Create notifications fan out to every `UserRole.ADMIN`** (the `BRAND_APPLICATION_SUBMITTED`
  precedent), not just holders of `platform:support:respond`. Narrowing to key-holders — and
  per-category routing — is a deferred refinement (PRD M3).
- **`packages/types` and the shared `NotificationBell` label map both had to gain the four
  `SUPPORT_TICKET_*` types** — the hand-maintained union is a subset of the Prisma enum and the
  admin/web `resolveNotificationHref` switches are exhaustive-by-convention.
- **Guest (signed-out) requests, magic-link verification and inbound reply-by-email are out of
  scope here** (PRD M3/M4). `POST /tickets` is `requireAuth`-only for now; the schema and
  `requesterEmail`/`emailVerifiedAt`/`GUEST` segment columns already exist so guests slot in
  without a migration.
