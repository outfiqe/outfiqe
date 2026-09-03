# Platform Metrics

## Purpose

The read-only cross-tenant monitoring surface: one summary row per tenant, platform-wide totals,
and a per-tenant trend. It answers "how big is each tenant and when did they last do anything" —
never "show me their contacts". Every number is an aggregate; there is no route that returns an
individual record.

## Structure

- `platform-metrics.constants.ts` — page sizes, sparkline window, active-member window, and the
  snapshot job interval.
- `platform-metrics.types.ts` — `TenantMetricRow` (aggregate-only — counts, timestamps, tenant
  identity; no field can hold a record), `TenantMetricListPage`, `PlatformOverview`,
  `TenantMetricDetail` (adds live partner/customer totals and a rollup series),
  `PlatformActivityTrendPoint` (`{ date, activityCount, dealCount, ticketCount, contactCount }`).
- `platform-metrics.repository.ts` — **`prismaRead` only, and it imports no `crm-*` repository**
  (enforced by the ESLint boundary in `platform-access`). It reads the denormalised counter
  columns already on `Organization`, groups organizations by plan for the overview, reads
  `OrgActivityRollup` for the per-tenant sparkline, sums `OrgActivityRollup` across tenants
  grouped by `day` for `platformActivityTrend`, and runs one raw `COUNT(DISTINCT …)` for active
  members. It also writes `OrgActivityRollup` rows for the snapshot job (through the primary
  `prisma`).
- `platform-metrics.service.ts` — `listTenants` / `overview` / `activityTrend` (straight from the
  repo), `tenantDetail` (adds partner/customer totals by going through `crmRelationshipsService` —
  a service, not a repository — and reading only its `total`), and `runDailySnapshot` (upserts one
  `OrgActivityRollup` per org per day from the counters + the active-member count).
- `platform-metrics.schemas.ts` — Zod for the list query (`plan`, `sort`, `page`, `pageSize`) and
  the `:orgId` param.
- `platform-metrics.controller.ts` / `platform-metrics.routes.ts` —
  `GET /api/platform/metrics/overview`, `/metrics/activity-trend`, `/metrics/tenants`,
  `/metrics/tenants/:orgId`, all gated `requirePlatformRole("platform:metrics:read")`.
- `platform-metrics.integration.test.ts`.

The daily snapshot is wired in `src/jobs/scheduled-jobs.ts` as `platform-metrics-snapshot`.

## Funnel

**User-facing:** a platform admin opens the tenants dashboard, sorts/filters by plan or last
activity, and opens one tenant to see its 30-day trend and its partner/customer totals.

**Technical:** `routes → requirePlatformRole("platform:metrics:read") → controller → service →
repository (prismaRead) → Postgres`. The list and overview are point reads / a single `GROUP BY`
over `organizations` — no scan of the CRM tables — because the per-tenant counts are already
maintained on `Organization` by the `crm-*` write services and the reconcile job. The activity
trend is a `GROUP BY day` over `org_activity_rollups` (the snapshot table), not a scan of
`crm_activities`.

## Non-obvious rationale

- **Every query is scoped `isPlatformOrg: false`** (`TENANT_ORGANIZATION_SCOPE` from
  `#constants/organization.constants`) — the platform org is an `Organization` row too, but it is
  not a tenant. Without the filter it shows up in the tenant list, the tenant count, the plan
  breakdown, `totalMembers`, and the nightly rollup; a `GET /metrics/tenants/:id` for the platform
  org now 404s. The same constant scopes the CRM organizations list in `crm-access`.
- **No `GROUP BY` over the CRM tables on any request path.** The counter columns on `Organization`
  exist precisely so the dashboard is a select over `organizations`, not a cross-tenant scan of
  `contacts` / `deals` / `crm_tickets` / `crm_activities`. The only per-request CRM-table query is
  the single-tenant `partnerCount` / `customerCount` on the detail view, and that is a windowed
  `COUNT` scoped to the tenant's linked brand.
- **The repository cannot import a `crm-*` repository** (lint-enforced). Reusing a tenant query
  with the org filter dropped is exactly what this module must not do; it builds its own minimal
  reads. Where it genuinely needs derived commerce numbers (partners/customers) it calls a
  `crm-*` _service_ and takes only the count.
- **`OrgActivityRollup` is snapshot history, not the source of truth.** The live numbers come from
  the `Organization` counters; the rollup is written once a day so the detail view can draw a
  trend. A missing day just leaves a gap in the sparkline.
