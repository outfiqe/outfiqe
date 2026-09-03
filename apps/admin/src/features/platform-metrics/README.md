# Platform Metrics (apps/admin)

## Purpose

The platform-admin monitoring dashboard: the Platform section's `/platform` landing (totals,
a platform-wide activity trend, and a settlement-reconciliation glance), platform-wide totals with
one aggregate row per CRM tenant, and a per-tenant detail with a 30-day activity trend. Reads the
`/api/platform/metrics/*` endpoints (plus `/api/admin/financial-rollup` for the reconciliation
card). Visible only to accounts with `platform:access` (it sits in the sidebar's Platform
section).

## Structure

- `schemas.ts` — Zod mirrors of the API shapes (`TenantMetricRow`, `PlatformOverview`,
  `TenantMetricDetail`, `TenantSparklinePoint`, `PlatformActivityTrendPoint`).
- `api.ts` — `platformMetricsApi` (`getOverview`, `getActivityTrend`, `listTenants`,
  `getTenantDetail`).
- `PlatformOverviewPage.tsx` — the `/platform` landing. A `StatCard` KPI row from `getOverview`
  (tenants / members / contacts / deals / tickets / activities), an `<ChartCard>` + `<TrendChart>`
  area chart of platform-wide CRM activity per day (`getActivityTrend`), and a
  settlement-reconciliation section that compares gateway net-held against total ledger owed for
  the last 30 days (`financialRollupApi.get("30d")`). The reconciliation query is independent and
  `retry: false` — if the caller's role can't read the rollup it degrades to a one-line note
  instead of a page-level error.
- `PlatformMetricsPage.tsx` — six overview stat cards + a plan filter, a sort control, and a
  paginated tenant table. Each row links to the detail.
- `TenantMetricsDetailPage.tsx` — the tenant's current metrics, its live partner/customer totals,
  and a `<TrendChart size="mini">` sparkline of `activityCount` across the rollup series.
- `PlatformMetricsPage.integration.test.tsx` / `PlatformOverviewPage.integration.test.tsx` — MSW
  render tests (table + empty state; KPI row, activity chart, settlement gap, rollup-forbidden
  degradation, overview error).

Routes: `_authenticated.platform.index.tsx` (`/platform` → `PlatformOverviewPage`),
`_authenticated.platform.metrics.index.tsx` (`/platform/metrics`) and
`_authenticated.platform.metrics.$orgId.tsx`. The "Overview" sidebar item is a plain
`SidebarNavItem` prepended to the Platform section in `components/AdminSidebar.tsx` (not a
`PlatformNavKey`, so it is never hidden by the co-founder nav-access toggle — a section landing
shouldn't be). "Tenant metrics" lives in `PLATFORM_NAV_ITEMS`.

## Non-obvious rationale

- **Counts only, by design.** There is no drill-down to a tenant's contacts or deals — the API
  has no such route. The detail page's partner/customer numbers are totals, not lists.
- **The platform activity trend is a running level, not per-day deltas, so it isn't zero-filled.**
  `/api/platform/metrics/activity-trend` sums each day's `org_activity_rollups` snapshot across
  tenants (a Prisma `groupBy` on `day`). A rollup row is a cumulative count as of that day, so a
  missing day means "no snapshot ran", not "zero activity" — the chart just shows whatever
  history the daily snapshot job has accumulated, and `<2` points renders "not enough history
  yet". Same semantics the per-tenant sparkline already had.
- **The mini sparkline moved from hand-rolled inline SVG to `<TrendChart size="mini">`.** Once the
  design system gained a real charting layer (`@outfiqe/design-system`'s recharts wrappers), a
  second hand-rolled chart wasn't worth keeping — the mini variant drops axes/grid/tooltip and is
  the same one `<path>` glance, now theme-aware and consistent with every other chart in the
  product.
- **The settlement card gates on `advancedFeaturesEnabled`? No — it gates on whether the rollup
  read succeeds.** `PlatformOverviewPage` is a `platform:access` surface; the financial rollup is
  a separate nav-key-guarded route, so a platform admin without `financial-rollup` access still
  gets the rest of the page and a quiet "unavailable for your role" line where the gap would be.
