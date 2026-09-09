# tag-reviews (admin)

## Purpose

The platform's read-only window into the Brand Tag Review funnel (PRD §12) — how fast brands
decide, what share of approvals are automatic vs. manual, why tags get rejected, how long a
creator waits for their first shoppable tag, and what's stuck. Backed by
`GET /tag-reviews/metrics` in `apps/api/src/modules/tag-reviews`.

This is distinct from `tag-reports` (the T&S report queue you _action_) — this page has no
actions, just numbers.

## Structure

- `TagReviewMetricsPage.tsx` — the `/tag-reviews` route. One `useQuery` → a grid of stat cards
  (latency per policy, time-to-first-shoppable, approval-source mix with percentages, rejection
  reasons, and a "watch list" of stuck tags + report volume). `formatHours` renders a duration as
  `m` / `h` / `d`.
- `api.ts` / `schemas.ts` — `GET /tag-reviews/metrics`, parsed with `tagReviewMetricsSchema`.

## Funnel

Sidebar → **Tag reviews** (a nav-only `PLATFORM_NAV_KEYS` entry, `requirePlatformAccess`
server-side). A single request; nothing to interact with. Use it during rollout to decide when to
turn the feature on for the next environment, and after launch to spot a policy that isn't working
(e.g. a high `SLA` approval share = brands ignoring their queue).

## Non-obvious rationale

**Latency counts only human brand decisions** (`reviewed_by_id IS NOT NULL`) — SLA auto-approvals
and policy auto-approvals are excluded so the number reflects how engaged brands actually are, not
how fast the sweep runs. Those show up separately in the approval-source mix.
