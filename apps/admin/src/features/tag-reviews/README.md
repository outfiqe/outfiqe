# tag-reviews (admin)

## Purpose

The platform's read-only window into the Brand Tag Review funnel (PRD §12) — how fast brands
decide, what share of approvals are automatic vs. manual, why tags get rejected, how long a
creator waits for their first shoppable tag, and what's stuck. Backed by
`GET /tag-reviews/metrics` in `apps/api/src/modules/tag-reviews`.

This is distinct from `tag-reports` (the T&S report queue you _action_) — this page has no
actions, just numbers.

## Structure

- `TagReviewMetricsPage.tsx` — the `/tag-reviews` route. One `useQuery` → a comprehension-first
  layout, in narrative order: an `InsightBanner` (the single most important thing to know, picked
  by priority — open issues, then zero-manual-review, then an all-clear), an `OverviewStrip` of
  four `StatCard`s (Tags live / Manual review rate / Median time to live / Open issues — each with
  a plain-language subtext, a `hint` tooltip, and a trend arrow via `buildTrendDelta`), an
  `ApprovalSourceMixSection` (`ChartCard` + a stacked `BarSeries` bucketed to Manual / Automatic /
  Legacy approval, with the finer per-source breakdown as a plain list _outside_ the `ChartCard` —
  see rationale below), a `FunnelSpeedSection` (brand review latency + time-to-first-shoppable,
  grouped since both expand on "Median time to live"), and the remaining detail cards (rejection
  reasons, watch list). `formatHours`/`formatPercent` render raw numbers; `JargonHint` is a small
  local `Tooltip` + info-icon wrapper for jargon that isn't already attached to a `StatCard`'s own
  `hint` prop (SLA lapsed, p50/p90, Trusted creator, Legacy approval).
- `api.ts` / `schemas.ts` — `GET /tag-reviews/metrics`, parsed with `tagReviewMetricsSchema`
  (including the `overview`/`PeriodTrend` shape the strip reads from).

## Funnel

Sidebar → **Tag reviews** (a nav-only `PLATFORM_NAV_KEYS` entry, `requirePlatformAccess`
server-side). A single request; nothing to interact with. Use it during rollout to decide when to
turn the feature on for the next environment, and after launch to spot a policy that isn't working
(e.g. a high `SLA` approval share = brands ignoring their queue) — the redesigned overview strip is
meant to make that read possible in about 5 seconds, without opening any detail card.

## Non-obvious rationale

**Latency counts only human brand decisions** (`reviewed_by_id IS NOT NULL`) — SLA auto-approvals
and policy auto-approvals are excluded so the number reflects how engaged brands actually are, not
how fast the sweep runs. Those show up separately in the approval-source mix.

**The overview strip's trend is "last 7 days vs. the 7 days before that," computed live on every
request — there's no daily-snapshot table backing it.** `platform-metrics` has one
(`OrgActivityRollup`) for its sparklines, but a brand-new snapshot table here would show "not
enough history" for the first two weeks after shipping, which defeats the point of a
comprehension-first redesign landing today. `creator_look_products` already has
`submitted_at`/`reviewed_at` going back to launch, so `apps/api/src/modules/tag-reviews`'s
`getMetrics` computes both windows with `FILTER (WHERE ...)`-scoped aggregates in the same
`Promise.all` it already used for everything else — see that module's own README for the exact
query shapes and the stock-vs-flow distinction (`Tags live` compares point-in-time totals; `Manual
review rate`/`Median time to live` compare activity _within_ each window).

**"Legacy approval" is a display-only rename of the `GRANDFATHERED` approval source, scoped to this
page.** The `TagApprovalSource.GRANDFATHERED` enum value is untouched — renaming a Prisma enum
ripples through migrations, seed data, and every other consumer, and nothing asked for that.
`apps/web`'s brand-dashboard `TagReviewCard.tsx` also shows this source but with its own sentence
("Already live before tag review launched"), not the bare word "Grandfathered," so it didn't need
the same change.

**The approval-source breakdown list lives _outside_ `ChartCard`, not inside its `children`.**
`ChartCard` wraps `children` in `aria-hidden` by design — it's meant for decorative chart visuals
only, with the real accessible data going through its separate `dataTable` prop (a `sr-only`
table). The breakdown list has interactive tooltip buttons (`JargonHint` on "SLA lapsed" and
"Legacy approval"); putting it inside `children` would have hidden those buttons from screen
readers and keyboard navigation entirely — caught by a component test (`findByRole("button", ...)`
timing out even though the text was visibly in the DOM) before it shipped, not after.

**The stacked bar buckets to 3 segments (Manual / Automatic / Legacy approval), not the full 6 raw
sources.** Nothing is lost — the 4 automatic sub-sources (`POLICY_OPEN`/`TRUSTED_CREATOR`/
`VERIFIED_BUYER`/`SLA`) still show individually in the breakdown list below the chart, and the
`ChartCard`'s `dataTable` still carries every raw source — the 3-way bucket is just what's
"immediately visible" in the chart itself, matching what was actually asked for.
