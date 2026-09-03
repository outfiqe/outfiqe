# creator-overview

## Purpose

Backs the creator's **Overview** dashboard (`apps/web` `/overview`) with a single read:
headline KPIs, a 30-day activity trend, and the most recent commissions — everything the landing
page shows, in one response so the page is one query and one loading state.

## Structure

- `creator-overview.routes.ts` — `GET /api/creators/me/overview`, `requireAuth` only. Mounted as
  a second router on `/api/creators` in `app.ts` (alongside `creatorRoutes`).
- `creator-overview.controller.ts` — resolves the caller from the auth principal, delegates.
- `creator-overview.service.ts` — gates on `requireApprovedCreator`, then fans out the reads with
  `Promise.all` and assembles the `CreatorOverview` shape. Reuses
  `commissionRepository.sumByStatusForCreator` and `commissionRepository.listForCreator` +
  `toCreatorCommissionView` from the `commissions` module rather than re-querying commissions.
- `creator-overview.repository.ts` — the reads this module owns:
  - `getDailyTrend` — one raw-SQL query: a `generate_series` **CTE** date spine `LEFT JOIN`ed to
    per-day commission sums and look counts, with `SUM(...) OVER (ORDER BY day)` for the running
    earnings total. Missing days come back as zero rows from SQL — no application-side zero-fill.
  - `getEarningsWindows` — one raw-SQL query bucketing the current vs previous 30-day earnings
    with `FILTER (WHERE ...)` aggregates, not two round-trips.
  - `getLookAggregates` — `prisma.creatorLook.aggregate` (`_count` + `_sum(likeCount)`).
  - `getFollowerCount` — reads the denormalized `User.followerCount` column (the same source
    `follows` module keeps in sync); no `Follow` row count.
- `creator-overview.constants.ts` — `TREND_WINDOW_DAYS` / `COMPARISON_WINDOW_DAYS` (30) and
  `RECENT_COMMISSION_LIMIT` (5).
- `creator-overview.types.ts` — `CreatorOverview` and its parts; `CreatorCommissionView` is
  re-used from `commissions`.

## Funnel

**User-facing:** an approved creator opens `/overview` and sees, in one paint, their total /
available / pending earnings and follower / look / like counts, an area chart of earnings per day
over the last 30 days, and their five most recent commissions — each linking into the full
Earnings ledger.

**Technical:** `route → controller (requireAuthPrincipal) → service (requireApprovedCreator →
Promise.all of commissionRepository + creatorOverviewRepository reads) → repository ($queryRaw
CTE + Prisma aggregate) → DB`. Response is the REST envelope `{ success, message, data }` with
`data: CreatorOverview`.

## Non-obvious rationale

- **No Redis cache.** This is a per-creator read hit on page load, not a hot shared path, and its
  cost is a handful of indexed aggregates. Caching per user would add invalidation complexity for
  no real gain; the DB is the critical dependency and a failure here is a failed request with
  nothing meaningful to fall back to.
- **Index reliance is deliberate, not overlooked.** The trend and window queries filter
  `creator_commissions` by `creator_id` — served by the `creator_id` prefix of the existing
  `@@index([creatorId, status])`. `creator_looks` is filtered by `creator_id` with only
  `created_at` indexed on its own; acceptable because a single creator's lifetime look count is
  small. If creator look volumes grow large, add `@@index([creatorId, createdAt])` to
  `CreatorLook`.
- **VOIDED commissions are excluded from earnings** (cancelled/refunded/fraud orders) but the
  status-sum KPIs come straight from `sumByStatusForCreator`, which only ever adds PENDING +
  AVAILABLE + PAID — so both paths agree without special-casing.
