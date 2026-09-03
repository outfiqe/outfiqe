# CRM Reporting & Search

## Purpose

Read-only aggregate reporting and cross-entity search for a CRM tenant. Three report endpoints
(pipeline value/outcomes by stage, support-ticket health, and a combined overview for the CRM
landing) and one global search over the tenant's partners, customers, deals and tickets.
Everything is computed in the database — SQL `GROUP BY` / `FILTER` aggregates, a `generate_series`
date spine, and `ILIKE` matching — never by fetching rows and reducing in application code.

## Structure

- `crm-reporting.constants.ts` — search query bounds (`MIN_SEARCH_QUERY_LENGTH`,
  `MAX_SEARCH_QUERY_LENGTH`), `SEARCH_RESULTS_PER_TYPE` (per-entity result cap),
  `ACTIVITY_TREND_WINDOW_DAYS` (30, the overview activity trend span), the
  `CRM_SEARCH_ENTITY` → permission-key map (`accounts:read` / `customers:read` / `deals:read` /
  `tickets:read`) and its derived `CRM_SEARCH_READ_PERMISSION_KEYS`, plus the search rate-limit
  window/max.
- `crm-reporting.types.ts` — `PipelineReport`, `TicketReport`, `CrmOverviewReport`,
  `CrmSearchResults` and their row shapes. `CrmOverviewReport` composes `PipelineReport` +
  `TicketReport` with an `activityTrend` (`{ date, count }[]`) and `openTasksDueTodayCount`.
  Search partner/customer groups reuse `PartnerSummary` / `CustomerSummary` from
  `crm-relationships`.
- `crm-reporting.repository.ts` — the raw SQL. `pipelineStageBreakdown` is one `LEFT JOIN` of
  `pipeline_stages` → `deals` with `COUNT(...) FILTER (WHERE status = ...)` and
  `SUM(value) FILTER (...)` per outcome, grouped and ordered by `sort_order` so empty stages still
  return a zero row. `ticketReport` runs a status `GROUP BY` and a second query for the
  open/resolved counts and `AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)))` mean resolution
  time (cast `::float8`, `NULL` when nothing is resolved). `dailyActivityCounts` is a
  `generate_series` CTE date spine `LEFT JOIN`ed to `crm_activities` grouped by
  `date_trunc('day', occurred_at)` — 30 zero-filled rows out of SQL. `openTasksDueTodayCount`
  counts `crm_tasks` that are `OPEN` and due before end of today (UTC), so overdue tasks are
  included. `searchDeals` / `searchTickets` are `title ILIKE '%q%'` scoped by `organization_id`,
  ordered by `updated_at`, capped.
- `crm-reporting.service.ts` — `getPipelineReport` folds the stage rows into branch totals;
  `getTicketReport` passes the repository shape straight through; `getOverviewReport` runs the
  pipeline, ticket, activity-trend and tasks-due reads in parallel and returns them as one payload
  for the CRM landing; `search` runs the four entity
  searches in parallel, **only** for the types the caller's role can read, each wrapped so one
  failing group logs and returns `[]` instead of failing the whole response (fail-open, the same
  pattern `crm-relationships` uses for optional metrics). Partner/customer groups delegate to
  `crmRelationshipsService.listPartners` / `listCustomers` with the search query — no second copy
  of that brand-scoped signal SQL.
- `crm-reporting.schemas.ts` — `crmSearchQuerySchema` (`q`, trimmed, length-bounded).
- `crm-reporting.controller.ts` / `crm-reporting.routes.ts` — routes mounted at `/api/crm` in
  `app.ts`, after the other CRM route groups and before the `crm-access` catch-all.

## Funnel

**User-facing:** a staff member types in the CRM search box in the tab strip and jumps straight to
a partner, customer, deal or ticket; on the Reports tab they see pipeline value by stage and a
ticket dashboard (open / resolved counts, mean time to resolve, status breakdown).

**Technical:** `apps/admin` `CrmSearchBox` / `ReportsSection` / `CrmOverviewSection` →
`reportingApi` (`apiClient`) → `GET /api/crm/search`, `GET /api/crm/reports/pipeline`,
`GET /api/crm/reports/tickets`, `GET /api/crm/reports/overview` → `resolveTenant` → `requireAuth`
→ `requireAdvancedCrmFeatures` → permission middleware → `crm-reporting.controller` → `.service` →
`.repository` (`$queryRaw`) → Postgres.

## Non-obvious rationale

- **`GET /api/crm/search` is gated with `requireAnyPermission`, not `requirePermission`.** Search
  spans four entity types with four different read permissions; a role holding any one of them can
  use search, and the service then filters the result groups down to exactly the types that role
  can read (superadmin sees all). `requireAnyPermission` (added to `crm-access.middleware.ts`
  alongside `requirePermission`) passes if the membership is an active SUPERADMIN or holds any key
  in the list, and stores the membership on `res.locals` the same way — so the controller reads
  the caller's permission keys without a second query.
- **All three report endpoints are gated on `reports:read`; search is not.** Reports are a single
  permission; search is deliberately reachable by any of the per-entity readers so a support agent
  with only `tickets:read` can still find a ticket by title.
- **`/reports/overview` re-uses `getPipelineReport` / `getTicketReport` rather than re-querying.**
  The CRM landing needs the same pipeline and ticket aggregates the Reports tab already computes,
  plus two small extras (activity trend, tasks due); composing the existing service methods keeps
  one definition of each figure. It stays a separate endpoint (not four client calls) so the
  landing is one request with one loading state.
- **Reporting and search sit behind `requireAdvancedCrmFeatures`** (402 when the trial has lapsed
  with no active subscription), the same gate as Partners/Customers/Pipeline/Tickets — reporting
  is an advanced feature, not part of the free tier.
- **Every aggregate is a single SQL statement.** Deal counts and value per stage/outcome, ticket
  status breakdown, and mean resolution time are all computed with `FILTER` / `GROUP BY` /
  `AVG(EXTRACT(EPOCH ...))` in Postgres — never `findMany` + `.reduce`. Empty stages still appear
  (the `LEFT JOIN` yields a zero row) so the first-record / no-data case renders a real "not
  enough data yet" state rather than a missing stage.
- **`deals.title` and `crm_tickets.title` carry `gin_trgm_ops` GIN indexes**
  (`20260829170000_crm_search_indexes`, `pg_trgm`), matching how product/creator search is
  indexed, so the `ILIKE '%q%'` scan stays index-backed as tenants accumulate rows. The
  `organization_id` equality in every search query is the primary narrowing; the trigram index
  handles the substring match on top of it.
