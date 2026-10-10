# trending

## Purpose

A debugging view of product trend scoring: the current top trending products, and the full score breakdown for any one product.

## Structure

- `api/trendingApi.ts` — the top trending list (`GET /admin/trending/products`), one product's score breakdown (`GET /admin/trending/products/:productId/debug`), and the product search used to pick one.
- `api/trendingSchemas.ts` — Zod schemas for the trending list and the score breakdown.
- `components/TrendingDebugPage.tsx` — the page: product search plus the selected product's breakdown.
- `components/TopTrendingList.tsx` — the current top trending products.
- `components/TrendStatCards.tsx` and `components/TrendDebugResult.tsx` — the score breakdown for one product.
- `utils/trending.utils.ts` — number formatting for the score values and the label for each baseline source.

## Funnel

**User-facing:** an admin opens Trending, sees which products rank highest, and searches for a product to see why it scores the way it does.

**Technical:** `routes/_authenticated.trending.tsx` → `components/TrendingDebugPage.tsx` → `api/trendingApi.ts` → `apiClient` → `/api/admin/trending` in `apps/api/src/modules/trending`.
