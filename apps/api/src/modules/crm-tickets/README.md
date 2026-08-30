# CRM Tickets

## Purpose

Support ticketing for a CRM tenant: complaint/request tickets against a **Customer** or
**Partner**, a forward-only status lifecycle, assignment to a teammate, and an internal comment
thread. Assigning a ticket (or a `crm-activities` task) to someone else fires a real-time
notification.

## Structure

- `crm-tickets.constants.ts` — `TICKET_SUBJECT_TYPES`, `ALLOWED_TICKET_TRANSITIONS` (the status
  state machine), `RESOLVED_TICKET_STATUSES`.
- `crm-tickets.types.ts` — `TicketRecord`, `TicketCommentRecord`, `TicketWithComments`.
- `crm-tickets.repository.ts` — Prisma CRUD; `transitionStatus` is a status-guarded `updateMany`
  that stamps/clears `resolvedAt`, so a concurrent status change loses cleanly.
- `crm-tickets.service.ts` — subject validation (`isPartner`/`isCustomer` from
  `crm-relationships`), the transition-legality check against `ALLOWED_TICKET_TRANSITIONS`, and
  the `CRM_ITEM_ASSIGNED` domain-event publish on create-with-assignee and reassignment.
- `crm-tickets.controller.ts` / `crm-tickets.routes.ts` — `/api/crm/tickets` (+ `/:id/status`,
  `/:id/assignee`, `/:id/comments`), behind the tenant / auth / advanced-features chain and
  `tickets:read` / `tickets:write` / `tickets:manage` (assignment) permissions.
- `crm-tickets.schemas.ts` — Zod validation.
- `crm-tickets.integration.test.ts` — the forward-only lifecycle + `resolvedAt` stamp, the
  comment thread, the assignment event (spied), subject and cross-tenant isolation.

## Funnel

**User-facing:** a member with `tickets:read` opens the Support tab, filters by status, opens a
row for the description + comment thread + status buttons; `tickets:write` moves the status and
comments; `tickets:manage` reassigns. The assignee gets a notification.

**Technical:** routes → `resolveTenant` → `requireAuth` → `requireAdvancedCrmFeatures` →
`requirePermission` → controller → service → repository → Postgres, plus an `eventBus.publish` on
assignment.

## Non-obvious rationale

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
- **`resolveAt` is stamped by the transition, not a separate action.** Moving to `RESOLVED` or
  `CLOSED` sets `resolvedAt`; reopening to `IN_PROGRESS`/`OPEN` clears it — there's no standalone
  "resolve" endpoint to keep in sync with the board state.
- **The admin notification bell doesn't route `CRM_ITEM_ASSIGNED` to `/crm/support` yet.**
  `packages/types`' hand-maintained `NotificationType` union (a subset of the Prisma enum — it
  already omits `WITHDRAW_REQUEST_*`) would need the new value, a shared-package change with
  web + admin fan-out. The notification is still created and shown; the click-through route is a
  deferred follow-up.
