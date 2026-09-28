# CRM Tickets

## Purpose

Support ticketing for a CRM tenant: complaint/request tickets against a **Customer** or
**Partner**, a forward-only status lifecycle, assignment to a teammate, and an internal comment
thread. Assigning a ticket (or a `crm-activities` task) to someone else fires a real-time
notification.

## Structure

- `crm-tickets.constants.ts` — `TICKET_SUBJECT_TYPES`, `ALLOWED_TICKET_TRANSITIONS` (the status
  state machine), `RESOLVED_TICKET_STATUSES`, `DEFAULT_TICKET_PAGE_SIZE` / `MAX_TICKET_PAGE_SIZE`
  (50 / 200, the list endpoint's page size).
- `crm-tickets.types.ts` — `TicketRecord`, `TicketCommentRecord`, `TicketWithComments`,
  `TicketPage` (`{ tickets, nextCursor }`).
- `crm-tickets.repository.ts` — Prisma CRUD; `transitionStatus` is a status-guarded `updateMany`
  that stamps/clears `resolvedAt`, so a concurrent status change loses cleanly. `listTickets`
  cursor-paginates (`take: limit + 1`, `orderBy` ending in `{ id: "desc" }` for a stable tiebreaker
  under the status-then-recency sort) instead of returning every matching row — see Non-obvious
  rationale.
- `crm-tickets.service.ts` — subject validation (`isPartner`/`isCustomer` from
  `crm-relationships`), the transition-legality check against `ALLOWED_TICKET_TRANSITIONS`, and
  the `CRM_ITEM_ASSIGNED` domain-event publish on create-with-assignee and reassignment, and
  `CRM_TICKET_CREATED` on every new ticket.
  `listTickets` slices the over-fetched row with `buildCursorPage` (`#lib/pagination.utils.js`),
  the same helper every other cursor-paginated list in this codebase uses.
- `crm-tickets.controller.ts` / `crm-tickets.routes.ts` — `/api/crm/tickets` (+ `/:id/status`,
  `/:id/assignee`, `/:id/comments`), behind the tenant / auth / advanced-features chain and
  `tickets:read` / `tickets:write` / `tickets:manage` (assignment) permissions.
- `crm-tickets.schemas.ts` — Zod validation.
- `crm-tickets.integration.test.ts` — the forward-only lifecycle + `resolvedAt` stamp, the
  comment thread, the assignment event (spied), subject and cross-tenant isolation, and
  cursor pagination across two pages.

## Funnel

**User-facing:** a member with `tickets:read` opens the Support tab, filters by status, opens a
row for the description + comment thread + status buttons; `tickets:write` moves the status and
comments; `tickets:manage` reassigns. The assignee gets a notification.

**Technical:** routes → `resolveTenant` → `requireAuth` → `requireAdvancedCrmFeatures` →
`requirePermission` → controller → service → repository → Postgres, plus an `eventBus.publish` on
assignment.

## Non-obvious rationale

- **`GET /tickets` is cursor-paginated.** `DEFAULT_TICKET_PAGE_SIZE`/`MAX_TICKET_PAGE_SIZE` existed
  in `crm-tickets.constants.ts` from early on but were never actually wired into the query — the
  endpoint fetched every ticket matching the filter with no `take` at all, getting slower as a
  tenant's ticket history grew. `TicketsPage.tsx` already had a single-status filter, so paginating
  was a drop-in fit: the repository now over-fetches by one row (`take: limit + 1`) and appends
  `{ id: "desc" }` to the existing `[{ status: "asc" }, { createdAt: "desc" }]` sort as a stable
  tiebreaker (Prisma's cursor pagination works with any `orderBy`, keyed off the cursor row's
  position in that exact order, not just `id`), and the admin page now uses
  `useInfiniteCursorPage` with a "Load more" button — the same pattern `support`'s ticket inbox
  already uses.
- **The status lifecycle is a declared state machine, not free-form.** `ALLOWED_TICKET_TRANSITIONS`
  lists the legal next states per status (forward `OPEN → IN_PROGRESS → RESOLVED → CLOSED`, plus
  reopen paths back to `IN_PROGRESS`/`OPEN`). An illegal jump is a `409 INVALID_TICKET_TRANSITION`;
  a race where the row moved out from under the caller is a `409 TICKET_STATUS_CHANGED` (the
  guarded `updateMany` claimed zero rows). This mirrors how order `fulfilmentStatus` transitions
  work in `orders`.
- **Assignment notifications reuse the platform notification pipeline.** A new
  `DomainEvents.CRM_ITEM_ASSIGNED` (`{ organizationId, itemKind: "task" | "ticket", itemId, title,
assigneeUserId, assignedByUserId }`) is published on the existing Redis Streams event bus; a
  consumer in `notifications/notification.events.ts` turns it into a `Notification` for the
  assignee (`NotificationType.CRM_ITEM_ASSIGNED`, entity `CRM_TASK` / `CRM_TICKET`), skipping
  self-assignment. `crm-activities`' task assignment emits the same event — one path, two callers.
- **A new ticket announces itself, so an unassigned one isn't missed.** `createTicket` publishes
  `DomainEvents.CRM_TICKET_CREATED` with the assignee (or `null`). When no one is assigned, the
  notifications consumer tells everyone in the tenant whose role holds `tickets:manage`
  (`CRM_TICKET_UNASSIGNED`), except the person who created it. See
  `notifications/README.md` for the shared tenant notification rules.
- **`resolveAt` is stamped by the transition, not a separate action.** Moving to `RESOLVED` or
  `CLOSED` sets `resolvedAt`; reopening to `IN_PROGRESS`/`OPEN` clears it — there's no standalone
  "resolve" endpoint to keep in sync with the board state.
- **The admin notification bell routes `CRM_ITEM_ASSIGNED` to `/crm/support` (tickets) or
  `/crm/tasks` (tasks) based on `metadata.crmItemKind`**, not to the specific ticket/task — neither
  `TicketsPage` nor `TasksPage` currently supports deep-linking to one row via the URL, so opening
  the exact item still means finding it on the list page. `packages/types`' hand-maintained
  `NotificationType`/`NotificationEntityType` unions mirror the full Prisma enums now (see
  `packages/types/src/notification/index.ts`) so this and the other previously-omitted types
  (`WITHDRAW_REQUEST_*`, `NEW_MESSAGE`) resolve a real in-app message and link instead of falling
  back to "You have a new notification" with a dead click.
