# Platform Metrics (apps/admin)

## Purpose

The platform-admin monitoring dashboard: platform-wide totals and one aggregate row per CRM
tenant, plus a per-tenant detail with a 30-day activity trend. Reads the
`/api/platform/metrics/*` endpoints. Visible only to accounts with `platform:access` (it sits in
the sidebar's Platform section).

## Structure

- `schemas.ts` — Zod mirrors of the API shapes (`TenantMetricRow`, `PlatformOverview`,
  `TenantMetricDetail`, `TenantSparklinePoint`).
- `api.ts` — `platformMetricsApi` (`getOverview`, `listTenants`, `getTenantDetail`).
- `PlatformMetricsPage.tsx` — six overview stat cards + a plan filter, a sort control, and a
  paginated tenant table. Each row links to the detail.
- `TenantMetricsDetailPage.tsx` — the tenant's current metrics, its live partner/customer totals,
  and a hand-rolled inline-SVG sparkline of `activityCount` across the rollup series.
- `PlatformMetricsPage.integration.test.tsx` — table render + empty state.

Routes: `_authenticated.platform.metrics.index.tsx` (`/platform/metrics`) and
`_authenticated.platform.metrics.$orgId.tsx`. The "Tenant metrics" sidebar item lives in
`PLATFORM_NAV_ITEMS` in `components/AdminSidebar.tsx`.

## Non-obvious rationale

- **Counts only, by design.** There is no drill-down to a tenant's contacts or deals — the API
  has no such route. The detail page's partner/customer numbers are totals, not lists.
- **The sparkline is inline SVG, not a chart library.** One `<path>` over the rollup series is
  enough for a trend glance and keeps the bundle unchanged; a real chart is only worth it if the
  dashboard grows more series.
