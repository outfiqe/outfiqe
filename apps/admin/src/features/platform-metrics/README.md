# Platform Metrics (apps/admin)

## Purpose

The platform-admin monitoring dashboard: the Platform section's `/platform` landing (what needs
action, where the money went, totals and a platform-wide activity trend), platform-wide totals with
one aggregate row per CRM tenant, and a per-tenant detail with a 30-day activity trend. Reads the
`/api/platform/metrics/*` endpoints (plus `/api/admin/financial-rollup/money-breakdown` for the
money section). Visible only to accounts with `platform:access` (it sits in the sidebar's Platform
section).

## Structure

- `api/platformMetricsSchemas.ts` — Zod mirrors of the API shapes (`TenantMetricRow`, `PlatformOverview`,
  `TenantMetricDetail`, `TenantSparklinePoint`, `PlatformActivityTrendPoint`).
- `api/platformMetricsApi.ts` — `platformMetricsApi` (`getOverview`, `getActivityTrend`, `listTenants`,
  `getTenantDetail`).
- `components/PlatformOverviewPage.tsx` — the `/platform` landing. KPI cards from `getOverview`, each
  linking to the organization list, the sections below, and an `<ChartCard>` + `<TrendChart>` area
  chart of platform-wide CRM activity per day (`getActivityTrend`). Once the overview has loaded it
  also mounts `features/product-tour`'s `PlatformDashboardTour` and shows a "Take the tour" link in
  the header that replays it — see that feature's own README.
- `components/QuickAccessSection.tsx` — "Needs action": shortcuts to the daily work queues, each
  showing how much is waiting (`getAttentionCounts`). If the counts fail, the shortcuts still work.
- `features/financial-rollup/components/MoneyBreakdownSection.tsx` — "Where the money went", shared
  with the financial rollup page.
- `components/PlatformMetricsPage.tsx` — six overview stat cards + a plan filter, a sort control, and a
  paginated tenant table. Each row links to the detail.
- `components/TenantMetricsDetailPage.tsx` — the tenant's current metrics, its live partner/customer totals,
  and a `<TrendChart size="mini">` sparkline of `activityCount` across the rollup series.
- `components/PlatformMetricsPage.integration.test.tsx` / `components/PlatformOverviewPage.integration.test.tsx` — MSW
  render tests (table + empty state; KPI row, waiting counts, activity chart, money section, its
  forbidden state, overview error).

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
- **The money section gates on whether its read succeeds.** `PlatformOverviewPage` is a
  `platform:access` surface; the financial rollup is a separate nav-key-guarded route, so a platform
  admin without `financial-rollup` access still gets the rest of the page and a quiet "isn't
  available for your role" line.
- **The old "Gap" card is gone because it warned about healthy money.** It compared money held with
  only what is still owed, so platform fees, delivery fees and paid-out money all counted as a gap.
  The money section follows paid orders through every destination and warns only about what can't
  be traced.
- **Waiting counts sit behind `platform:metrics:read`, not each queue's own permission.** They are
  bare counts with no records, and each shortcut's page still checks its own access.
