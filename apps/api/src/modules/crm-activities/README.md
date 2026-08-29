# CRM Activities

## Purpose

Logged interactions (note / call / message / email) and due-date tasks against a CRM subject —
a Partner, a Customer, or a Deal — plus the **unified timeline** that merges those logged
activities with the subject's live order/payment history at read time.

## Structure

- `crm-activities.constants.ts` — the `partner | customer | deal` subject-type tuple and the
  timeline/task page-size bounds.
- `crm-activities.types.ts` — `ActivityRecord`, `TaskRecord`, the `TimelineEntry` union
  (`activity` | `order`), and the create inputs.
- `crm-activities.utils.ts` — `subjectToColumns`, mapping a `{ subjectType, subjectId }` to the
  right one of `partnerCreatorId` / `customerUserId` / `dealId`.
- `crm-activities.repository.ts` — Prisma for activity/task CRUD; **`timelineForSubject` is one
  raw `$queryRaw`** that `UNION ALL`s a `crm_activities` subquery with an `orders` subquery and
  lets Postgres do the `ORDER BY at DESC LIMIT` — the merge happens in the database, in one
  round-trip, never as a denormalized copy.
- `crm-activities.service.ts` — validates the subject exists in this CRM (`isPartner` /
  `isCustomer` from `crm-relationships`, or a deal lookup from `crm-pipeline`), stamps
  `completedAt` on a task's `DONE`/`OPEN` transitions, and wraps the timeline merge in a
  try/catch that falls back to an **activities-only** result with `partial: true`.
- `crm-activities.controller.ts` / `crm-activities.routes.ts` — `GET /api/crm/timeline`,
  `GET|POST|DELETE /api/crm/activities`, `GET|POST|PATCH|DELETE /api/crm/tasks`, all behind the
  tenant / auth / advanced-features chain and `activities:*` / `tasks:*` permissions.
- `crm-activities.schemas.ts` — Zod validation; `subjectType` and `subjectId` must be given
  together on a task.
- `crm-activities.integration.test.ts` — the merged timeline, the `partial` fallback (the raw
  query is stubbed to throw), subject and cross-tenant isolation, and the task `completedAt`
  lifecycle.

## Funnel

**User-facing:** a member opens a Partner or Customer detail page and sees the merged Timeline —
their own logged notes/calls interleaved with real orders — and can log a new entry inline. The
Tasks tab lists due-dated tasks assignable to any teammate, with a checkbox to complete them.

**Technical:** routes → `resolveTenant` → `requireAuth` → `requireAdvancedCrmFeatures` →
`requirePermission` → controller → service → repository (`$queryRaw` for the timeline, Prisma
elsewhere) → Postgres.

## Non-obvious rationale

- **The timeline is a query-time merge, not a table.** Order rows are read live from
  `orders`/`order_items` every time; there is no copy of order data in the CRM. The `UNION ALL`
  keeps the merge, sort and limit in Postgres so the API only ever handles one bounded result
  set.
- **A failed live read degrades, it doesn't 500.** `getTimeline` catches any error from
  `timelineForSubject`, logs it, and returns the activities-only list with `partial: true` — the
  same fail-open shape `crm-relationships` and `trending`'s cache reads already use. The admin
  Timeline shows a "live order history is temporarily unavailable" notice on that flag.
- **`IS NOT DISTINCT FROM` for the subject match.** The three subject columns are nullable and
  exactly one is set; `a.partner_creator_id IS NOT DISTINCT FROM $1` matches both "equal" and
  "both null" without a pile of `OR (… IS NULL AND … IS NULL)` branches.
- **Real-time task-assignment alerts are deferred to Chunk 8.** Chunk 8 (Support & ticketing)
  needs the same assignee-notification path for tickets, so the `NotificationType` enum addition +
  the Redis Streams consumer + the admin notification route-resolver entry are done once there and
  reused, rather than half-wired here.
