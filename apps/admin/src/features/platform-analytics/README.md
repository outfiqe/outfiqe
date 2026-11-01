# platform-analytics

## Purpose

The Product analytics page (`/platform/analytics`, sidebar group Growth). It shows how shoppers
find Outfiqe, where they drop out before buying, whether muse looks lead to orders, whether
people come back, and what they search for without finding anything. Behaviour numbers come from
PostHog through the API (`apps/api/src/modules/product-analytics`); order and money totals come
from the database (`financial-rollup`).

## Structure

- `api/platformAnalyticsApi.ts`: one call per insight, each taking a range (`7d`, `30d` or
  `90d`).
- `api/platformAnalyticsSchemas.ts`: Zod mirrors of the API answers. Each answer has a `status`
  (`fresh`, `stale`, `not_connected` or `unavailable`), `refreshedAt`, a `posthogUrl` and the
  insight itself.
- `components/PlatformAnalyticsPage.tsx`: the page. It has the header, the range chips (kept in
  the URL as `?range=` through `useSearchFilter`), the estimate note, and the eight sections.
- `components/AnalyticsInsightSection.tsx`: the card every section uses. It owns the loading
  skeleton, the "not connected", "unavailable" and "couldn't load" messages, the stale note, and
  the "Open in PostHog" link.
- `components/AnalyticsOverviewSection.tsx`: visitors, sign-ups, buyers and the visitor-to-buyer
  rate. Under them, the exact last-30-day orders, GMV and muse-credited share from the financial
  rollup.
- `components/SiteTrafficSection.tsx`: page views, sessions, average session and bounce rate,
  with the top pages and where visits start and end. Product pages show the product's name,
  with the path on hover.
- `components/SiteSpeedSection.tsx`: the four speed measurements with chips for how slow a visit to look at (P75, P90, P95, P99), device and page, a reading count per measurement, and the slowest pages. Under 10 readings it says so instead of giving a rating.
- `components/AnalyticsSectionNav.tsx`: jump links to each section.
- `constants/analyticsCopy.constants.ts`: every tooltip and section description, written as full sentences for someone who isn't an engineer.
- `components/PurchaseFunnelSection.tsx`, `LookToOrderSection.tsx`: the step lists
  (`FunnelSteps`) with orders by payment method, orders credited to a muse, and the most-viewed
  muses.
- `components/AcquisitionSection.tsx`: top sources, UTM campaigns and muse link clicks.
- `components/RetentionSection.tsx`: weekly visitors over 8 weeks (`TrendChart`) and the
  share of buyers in the range who had ordered before ("Returning buyers").
- `components/ZeroResultSearchesSection.tsx`: the most common searches that found nothing.
- `components/FunnelSteps.tsx`: one row per step, with a proportional bar and the share kept
  from the previous step.
- `components/RankedList.tsx`: a labelled list of counts, with an empty message.
- `hooks/usePlatformAnalyticsInsight.ts`: one React Query hook for any insight, keyed by insight
  and range.
- `hooks/useExactOrderTotals.ts`: the 30-day financial rollup, with no retry.
- `constants/platformAnalytics.constants.ts`: ranges and labels, step and payment-method labels,
  query keys, and every message on the page.
- `utils/platformAnalytics.utils.ts`: step shares, source, page and payment-method labels, sums,
  session and speed formatting, and speed ratings.

## Funnel

**User-facing:**

1. A co-founder, or a staff member whose role has "View product analytics", opens Product
   analytics in the sidebar.
2. They pick 7, 30 or 90 days, and each section fills in on its own.
3. If PostHog isn't connected yet, each section says what to set on the server.
4. If PostHog is briefly down, the last saved numbers show, marked as saved.

**Technical:** each section → `usePlatformAnalyticsInsight(key, platformAnalyticsApi.get…,
range)` → `GET /api/platform/analytics/…?range=` → the API's cached PostHog Query API answer. The
overview's exact cards → `useExactOrderTotals` → `GET /api/admin/financial-rollup?range=30d`.

## Non-obvious rationale

- **Who sees it.** The sidebar item and the page follow `PLATFORM_SECTION_ACCESS`
  (`platform-analytics` → `platform:analytics:read`), the same shared rule every platform
  section uses.
  - Co-founders always see it.
  - The full-access Admin role has the permission.
  - Any other role needs it ticked in the role builder.
  - Co-founders can also hide it per admin on the Navigation access page.
- **Each section loads and fails on its own.** One slow or failing insight never blanks the
  page. A role without the finance permission still sees every PostHog section; only the exact
  totals say they need that permission.
- **The exact totals always cover the last 30 days.** The financial rollup only offers a 30-day
  window (or the payout cycle, or all time), so those cards are labelled with their own period
  instead of following the range chips.
- **Muse names come from our database, not PostHog.** PostHog only stores ids, never names. The
  API looks up the top 10 ids once per refresh, so names are in the cached answer. An id whose
  account was deleted shows as "A muse whose account no longer exists".

**P75 is the one Google judges.** The Good and Poor limits were set for P75, so at P95 and P99 a rating of Poor is normal and doesn't mean the site is broken. The chips exist to show how bad the slow end gets.
