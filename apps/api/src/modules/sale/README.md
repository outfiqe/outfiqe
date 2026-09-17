# Sale — personalized, discount-led product ranking

## Purpose

Ranks currently-discounted products for the homepage "On Sale" rail (`GET /products/sale`) and its
"View All" browse (`GET /products?sort=on-sale`), personalizing the rail per signed-in viewer from
their own saves, cart, purchase history and liked-look-tagged products. Deliberately built as a
thin ranking/personalization layer over data this codebase already owns — `ProductDiscount`
(`../discounts`), the existing trending popularity score (`../trending`), and existing shopping
signal tables — rather than a new source of truth. See `docs/PRD-SALE-SECTION.md` for the product
spec this module implements.

## Structure

- `sale.constants.ts` — scoring weights/caps, the scoring job interval, candidate/diversity pool
  sizes, affinity signal weights and their per-key/total caps, viewer-signal lookup limits. Plain
  module constants, same convention as `trending.constants.ts`.
- `sale.types.ts` — `SaleCandidate` (a discounted product before scoring), `ScoredSaleCandidate`
  (with the score breakdown), `AffinitySignal`/`AffinitySignalSource`/`ViewerAffinityWeights`
  (the four shopping-signal types and their derived per-category/type/brand weights),
  `ViewerShoppingSignals`, `SaleDebugSnapshot`/`SaleProductSummary` (admin debug shapes),
  `SaleSnapshotCursor`/`SaleProductPage` (browse pagination).
- `sale.utils.ts` — the entire scoring pipeline as pure functions: `computeDiscountPoints`,
  `normalizeTrendingScore`, `computeFreshnessBoost`, `scoreSaleCandidate` (discount depth is the
  dominant term; popularity and freshness are capped low enough that they can only break ties
  among similarly-discounted products — see rationale below), `deriveAffinityWeights`,
  `applyPersonalization`, `excludeAlreadyPurchased`. No DB/Redis access here, mirroring
  `trending.utils.ts`'s split of scoring math from data access — every function is unit-testable
  without a database.
- `sale.repository.ts` — `listActiveDiscountCandidates` (approved, in-stock, active-brand products
  with a currently-active discount — reuses `../products/product.repository.ts`'s
  `withActiveDiscount()` predicate rather than re-deriving the isActive/startsAt/endsAt logic) and
  `listViewerShoppingSignals` (four bounded, `Promise.all`'d queries per viewer: recent
  `SavedProduct`, `CartItem`, `OrderItem`, and `CreatorLookProduct` tagged in looks the viewer has
  liked).
- `sale.service.ts` — `runScoring` (the scheduled job), `getSaleProductIds` (rail: cache read +
  live personalization), `listSaleProductIds` (View All: cursor-paginated over the full,
  non-diversified scored list, session-snapshot style — mirrors
  `trendingService.listTrendingProductIds` including its resume-in-place-on-expiry behavior),
  `listTopSaleProducts`/`getDebugSnapshot` (admin debug).
- `sale.schemas.ts` / `sale.controller.ts` / `sale.routes.ts` — `GET /api/admin/sale/products` and
  `.../:productId/debug`, mirroring `../trending`'s own admin debug routes exactly (same
  `requireAuth + requirePlatformAccess` guard).
- `sale.utils.test.ts` — unit tests for the scoring/personalization math, including the
  discount-dominance property and the affinity boost cap.
- `sale.integration.test.ts` — real-DB/Redis tests: discount eligibility (active/expired/
  not-started/deactivated/out-of-stock/suspended-brand exclusions), score ordering, the admin
  routes, live personalization (saved-category and liked-look-tag signals actually reorder the
  rail; a purchased product is never returned; a fresh account sees what an anonymous visitor
  sees), and the `sort=on-sale` browse (unfiltered fast path, pagination, category-filtered
  fallback, empty pool).

## Funnel

**User-facing:** the homepage's "On Sale" rail shows up to 5 discounted products. Signed in with
some shopping history, the rail leans toward categories/brands/types the viewer has engaged with,
and never shows something they've already bought. Anonymous or with no history yet, everyone sees
the same pool, which reshuffles roughly every 30 minutes. The rail doesn't render at all when
nothing is currently on sale. "See More" leads to `/shop?sort=on-sale`, the full, unpersonalized,
deepest-discount-first catalog of everything on sale.

**Technical:**

1. `ProductDiscount` rows are created/edited by brands entirely outside this module (see
   `../products/README.md`) — this module only reads currently-active ones.
2. `sale-scoring` (every 30 min, `startIntervalScheduler`) reads all active-discount candidates,
   merges in each product's existing trending score (`trendingService.getTrendingProductScores`,
   a new thin addition to `../trending`'s public interface — reads its cache, doesn't recompute),
   scores/sorts them, applies the same generic `applyDiversity`/`applyWeightedRotation` utilities
   `../trending` uses (imported from the shared `#lib/trend-scoring.utils.js`, not reimplemented),
   and writes the ranked pool to `cache:product-sale:global` (short TTL on an empty result, same
   fix already proven necessary for trending's own cache).
3. `GET /products/sale` (`productService.listSale` → `saleService.getSaleProductIds`) reads that
   cached pool; for a signed-in viewer, re-ranks it live from a handful of bounded, indexed
   queries over that one viewer's own shopping signals — cheap, since it's a re-sort of an
   already-small cached list, not a recompute, and always reflects their latest activity.
4. `GET /products?sort=on-sale` follows the exact same unfiltered-fast-path-with-filtered-fallback
   shape `sort=trending` already established in `product.service.ts`'s `listPublic`.

## Non-obvious rationale

**One scheduled job, not two.** `../trending` needs separate aggregation and scoring jobs because
its five signals are raw, high-frequency event streams that need hourly bucketing. `ProductDiscount`
rows are the opposite — low-frequency, already-persisted, already the source of truth — so there's
nothing to aggregate. `runScoring` reads them directly every cycle.

**Discount depth dominates the score by construction, not by convention.** `scoreSaleCandidate`
gives a discount's percent-off directly as points (0–100), while popularity and freshness are
capped at a combined maximum well under 10 points (`SALE_POPULARITY_WEIGHT_CAP` +
`SALE_FRESHNESS_WEIGHT_CAP`). This isn't just documented — `sale.utils.test.ts` asserts the caps
sum to less than 10 and separately proves a 10-point-cheaper discount always outranks a more
popular one. This was an explicit product requirement ("give more priority to highly discounted
products"), not a default the formula happened to produce.

**Personalization is capped so it reorders within, but never inverts, the discount-led ranking.**
`applyPersonalization` multiplies a candidate's score by `(1 + boost)`, and the total boost is
capped at `AFFINITY_BOOST_CAP` (0.5). A strongly-preferred category can pull a modestly-discounted
product above a slightly-deeper one, but can't make a 15%-off item beat a 40%-off item — the same
"personalize within bounds, don't let it dominate" shape `../creator-looks`' for-you feed already
uses for its own follow/hashtag boosts.

**Affinity signal weights are ordered by how explicit the intent is:** an explicit save or cart-add
counts for more than a purchase (used only for category/type/brand affinity — the exact purchased
product is always excluded outright, never just down-weighted) or a liked-look's tagged product
(the most inferred of the four signals). Each signal type's contribution to a single
category/type/brand is capped per-key (`AFFINITY_MAX_WEIGHT_PER_KEY`) so one repeatedly-saved
product can't alone dominate a viewer's whole affinity profile.

**Personalization is computed live per request, never cached per viewer.** The only cached thing
is the shared candidate pool (~50 products). A viewer's own affinity read is a handful of bounded,
indexed queries scoped to just their `userId` — cheap regardless of total catalog size or
concurrent traffic, and always reflects a save or purchase made moments ago. Caching a
personalized result per user was considered and rejected for v1: it would trade that freshness for
savings on a query that's already cheap, and would multiply the cache footprint by every active
user instead of staying at one shared entry.

**Anonymous visitors share one rotating pool, not individually randomized ones — a stated product
decision, not an oversight.** True per-visitor randomization for anonymous traffic would need a
persistent visitor-identity mechanism this codebase doesn't have (the closest thing, `../trending`'s
own session-cursor, is a random id minted per browse _session_ for pagination, not a durable
identity usable for personalization). Introducing one was judged disproportionate to a homepage
rail and out of scope for v1 — see `docs/PRD-SALE-SECTION.md` §5.4.

**No minimum discount threshold to qualify for the pool.** Any active `ProductDiscount` is
eligible; discount depth doing the ranking (see above) means a trivial discount just sorts low
rather than needing a separate cutoff. Revisit if that turns out not to be enough in practice.

**The "View All" browse is never personalized, even for a signed-in viewer** — same rationale
`../trending`'s own README gives for its paginated browse: a "see more" page is expected to show
the objectively best deals in a stable order, not a per-viewer-shuffled sample.
