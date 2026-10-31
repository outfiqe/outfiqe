# tag-reviews (admin)

## Purpose

The platform's window into Brand Tag Review: how fast brands answer, how live tags got approved,
why tags are rejected, how long a muse waits for a first shoppable tag, and what is stuck. Every
number opens the real tags behind it, down to one tag's full story. Backed by
`GET /tag-reviews/metrics` and `GET /tag-reviews/metrics/tags` in
`apps/api/src/modules/tag-reviews`.

This page only reads. The queue you act on is `tag-reports`, and it links there for open reports.

## Structure

- `components/TagReviewMetricsPage.tsx` — the `/tag-reviews` route, composed of the sections below.
- `components/MetricsOverviewStrip.tsx` — `InsightBanner` (the one thing to know, from
  `utils/tagReviewInsight.utils.ts`) and `OverviewStrip`, four `StatCard`s that each state their
  time period and link to their tags.
- `components/MetricsDetailSections.tsx` — Needs attention, Why tags were rejected, How fast brands
  answer, How fast looks become shoppable.
- `components/ApprovalSourceMixSection.tsx` — How live tags got approved, one clickable row per
  approval source with a plain explanation and its share.
- `components/MetricsCardParts.tsx` — `Card`, `MetricRow`, `MetricLinkRow`, `MetricTagsLink`,
  `EmptyState`.
- `components/TagReviewTagsPage.tsx` — the `/tag-reviews/tags` route: the tags behind a number.
  `MetricTagRow.tsx` is one row and `MetricTagDrawer.tsx` is the side panel with one tag's story.
- `constants/metricTagViews.constants.ts` — each list view with its title, explanation and empty
  message, and the `MetricTagsSearch` URL shape. `utils/metricTagsSearch.utils.ts` validates the URL.
- `constants/tagReviewMetrics.constants.ts` — plain labels, explanations, targets, and
  `MIN_SAMPLE_TO_JUDGE`.
- `utils/tagReviewMetrics.utils.ts` — duration, count and trend formatting, and `judgeSpeed`.
  `utils/metricTagOutcome.utils.ts` words a single tag's outcome.
- `hooks/useInfiniteMetricTags.ts` — the paged tag list.
- `api/tagReviewsApi.ts` / `api/tagReviewsSchemas.ts` — both endpoints and their Zod schemas.

## Funnel

**User-facing:** open Sidebar → **Tag reviews** and read the banner. It says what is wrong, or that
all is well. Click any card or row to see the tags behind that number, switch between views with
the chips, then click a tag to read what happened, who was involved, and open the look, product,
brand or muse on the site.

**Technical:** overview: `TagReviewMetricsPage` → `tagReviewsApi.metrics` →
`GET /tag-reviews/metrics`. List: `MetricTagsLink` puts the view in the URL →
`TagReviewTagsPage` → `useInfiniteMetricTags` → `tagReviewsApi.metricTags` →
`GET /tag-reviews/metrics/tags`. The side panel uses the row already loaded, so it needs no call.

## Non-obvious rationale

**A number below `MIN_SAMPLE_TO_JUDGE` (5) is shown as a count, never a verdict.** "100%" from 3
tags or "too slow" from 1 answer reads as a finding when it is only noise, so the cards show
"3 of 3", hide the trend, and the speed rows say "Too few to judge".

**The banner reports missed targets, not just open issues.** It used to say all was well while looks
took more than double the target. The order in `buildTagReviewInsight` is what most needs a person:
stuck tags and open reports, then missed targets, then "too early to judge", then the all-clear.

**Each card links to a view with the same period as its number.** That is why there are separate
`APPROVED_THIS_WEEK` and `FIRST_LIVE_THIS_WEEK` views: the count on the list has to match the card.

**The card link stretches over the whole `StatCard` with `after:absolute after:inset-0`** instead of
wrapping the card in a link, because the card's info button can't legally sit inside a link.

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

**"From before reviews started" is a display-only name for the `GRANDFATHERED` approval source.** The
enum value is untouched, because renaming a Prisma enum ripples through migrations and every other
consumer.
