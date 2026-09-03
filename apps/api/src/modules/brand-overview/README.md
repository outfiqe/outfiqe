# brand-overview

## Purpose

Backs the brand owner's **Overview** dashboard (`apps/web` `/overview`) with a single read:
revenue and payout KPIs, a 30-day revenue trend, and the most recent order items for the brand's
products.

## Structure

- `brand-overview.routes.ts` — `GET /api/brands/me/overview`, `requireAuth`. Mounted as a second
  router on `/api/brands` in `app.ts` (alongside `brandRoutes`).
- `brand-overview.controller.ts` — resolves the caller's brand via `requireBrandId(userId)` (the
  same guard `brand-payouts` uses), delegates.
- `brand-overview.service.ts` — `Promise.all` of the reads, then assembles `BrandOverview`.
  Reuses `brandPayoutService.getSummary` for the payout figures and
  `orderRepository.listItemsForBrand` + `toBrandOrderItemView` for the recent list.
- `brand-overview.repository.ts` — the reads this module owns, all aggregated in SQL:
  - `getRevenueWindows` — one raw query: lifetime revenue plus current- vs previous-30-day
    revenue via `FILTER (WHERE ...)` aggregates, summing `qty * unit_price` over the brand's
    order items.
  - `getDailyTrend` — one raw query: a `generate_series` CTE date spine `LEFT JOIN`ed to per-day
    revenue and distinct order counts; missing days are zero rows from SQL.
  - `getCatalogCounts` — one raw query: product count and low-stock count, where low stock is the
    live `SUM(product_sizes.stock)` per product against `LOW_STOCK_THRESHOLD` (imported from
    `products`), not the drift-prone `products.low_stock` column (see `products/README.md`).
  - `getUnfulfilledItemCount` — `prisma.orderItem.count` for paid items not yet delivered or
    cancelled.
- `brand-overview.constants.ts` — window sizes (30) and `RECENT_ORDER_LIMIT` (5).
- `brand-overview.types.ts` — `BrandOverview` and its parts; `BrandOrderItemView` is re-used from
  `orders`.

## Funnel

**User-facing:** a brand owner opens `/overview` and sees, in one paint, revenue (last 30 days
with a delta, plus lifetime), available and pending payout, product and low-stock counts, how
many paid items still need fulfilling, an area chart of revenue per day over 30 days, and their
five most recent order items — each linking into the full Orders view.

**Technical:** `route → controller (requireAuthPrincipal → requireBrandId) → service (Promise.all
of brandOverviewRepository + brandPayoutService + orderRepository) → repository ($queryRaw / Prisma
count) → DB`. Response is `{ success, message, data: BrandOverview }`.

## Non-obvious rationale

- **"Revenue" counts `qty * unit_price` on order items whose order is `payment_status IN (PAID,
DUE)` and `fulfilment_status <> CANCELLED`** — the same "this is a real sale" filter
  `products` uses for its card social-proof stats. COD orders (`DUE`) count; failed/refunded and
  cancelled orders do not. This is gross merchandise value for the brand's items, not the brand's
  net payout (that's the separate `availablePayout` / `pendingPayout` KPIs from
  `brandPayoutService`).
- **No Redis cache**, same reasoning as `creator-overview`: a per-brand read on page load, a
  handful of aggregates, nothing to fail-open to if the DB is down.
- **Index reliance:** the revenue and trend queries filter `products` by `brand_id` (served by
  `@@index([brandId])`) and join `order_items` by `product_id` (`@@index([productId])`) and
  `orders` by id. Acceptable for a single brand's catalog and order volume at this scale.
