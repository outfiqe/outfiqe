# Personalized Sale Section — PRD

Status: **Draft — awaiting review.** Nothing in this document has been implemented. Once the
approach is confirmed, implementation proceeds phase-by-phase per §9.

## 1. Goal

Add a "Sale" rail to the landing page that surfaces brand-discounted products, ranked
differently for each visitor based on what they've saved, added to cart, bought, and shown
interest in (via liked/tagged creator looks) — so two visitors browsing at the same time can see
different products, and the same visitor sees a refreshed set over time rather than a static rail.
Ships with a "View All" page, matching every other landing rail.

## 2. Scope

### 2.1 In scope

- A new landing-page rail, 5 products, showing currently-discounted, in-stock, approved products.
- Personalized ranking for signed-in visitors, derived from their own saved products, cart
  contents, purchase history, and creator-look engagement (likes → tagged products).
- A shared, periodically-rotating ranking for anonymous visitors (see §5.4 — this is a stated
  design decision, not full per-anonymous-visitor personalization).
- A "View All" page at `/shop?sort=on-sale`, listing every currently-discounted product, reusing
  the existing `/shop` browse/filter/pagination infrastructure.
- Reuse of the existing discount data model (`ProductDiscount`, `discounts` module's money math)
  and the existing `trending` module's popularity scoring — no new source-of-truth data, no new
  activity-aggregation pipeline.

### 2.2 Non-goals (v1)

- No new admin UI. Discounts are already brand-managed (`products` module's
  `PATCH/PUT/DELETE /products/:id/discount`); this feature only ranks and displays what already
  exists.
- No true per-anonymous-visitor personalization (would require introducing a persistent visitor-id
  cookie/tracking mechanism this codebase doesn't have today — see §5.4).
- No minimum-discount-percent threshold to qualify for the rail (any active `ProductDiscount`
  qualifies). Worth revisiting post-launch if trivial (e.g. 2%) discounts crowd out meaningful
  ones — flagged as a follow-up, not built speculatively now.
- No feature flag / staged rollout. Every existing landing rail (Trending, New Arrivals, Creator
  Looks) ships directly as a parallel-route slot with no flag; this follows the same convention.
  (Easy to add one later if requested — not a blocker either way.)

## 3. What a visitor sees

**Signed in, with activity:** the rail shows discounted products skewed toward the categories,
brands, and product types they've engaged with — a product they saved last week now on sale
ranks above an unrelated discounted product with a deeper discount. A product they've already
bought is never shown again in this rail (see §5.3).

**Signed in, no activity yet (new account):** falls back to the same globally-ranked pool
anonymous visitors see (§5.4) — there's no affinity signal to personalize from yet.

**Anonymous:** sees a "best of the sale pool" set — ranked by discount depth, recency, and
existing product popularity (reusing `trending`'s score) — that reshuffles on the same cadence the
scoring job runs (~30 min), so it isn't frozen, but it isn't different per anonymous visitor either
(§5.4 explains why).

**Empty pool:** if fewer than 5 products currently have an active discount, the rail shows however
many exist. If zero, the rail doesn't render at all (no "nothing on sale" empty state) — an empty
promotional section undermines the section's own purpose; this mirrors how purely-editorial
sections behave when there's nothing to show, rather than trending/new-arrivals' text empty-state
(those are evergreen sections that are never expected to be empty; Sale can legitimately be empty
if no brand is currently running a discount).

**View All (`/shop?sort=on-sale`):** every currently-discounted, in-stock, approved product,
sorted by discount depth (deepest first) as the default within the sort, with the same
category/price/brand filters and pagination `/shop` already has. Not personalized — matching the
existing rationale in `trending/README.md` ("a 'see more' page is expected to show the objectively
highest-scoring items in order, not a diversity/personalization-shuffled sample").

## 4. Why this is buildable cheaply — what already exists

| Need                                                                 | Already exists                                                                                                       | Where                                            |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| "Is this product currently discounted, and by how much"              | `ProductDiscount` model, `withActiveDiscount()` query filter, `resolveBrandFundedUnitPrice`/`computeDiscountPercent` | `discounts` module, `product.repository.ts`      |
| Discount badge / struck-through price UI                             | `ProductCard` already renders `discountPercent`/`effectivePrice` when present                                        | `apps/web/.../ProductCard/index.tsx`             |
| "How popular is this product right now"                              | `ProductTrendMetric` scores, `trendingService.getTrendingProductIds()`                                               | `trending` module                                |
| Ranked-rail + "View All" page pattern                                | `ProductRail`, `TrendingNow`, `/shop?sort=trending` cursor-paginated browse                                          | `landing` feature, `products`/`trending` modules |
| Personalized re-ranking on top of a base score                       | `buildPersonalizedSnapshot`/`scorePersonalized` (follow/hashtag affinity boosts on trending scores)                  | `creator-looks/creatorLook.repository.ts`        |
| Per-user shopping signals                                            | `SavedProduct`, `CartItem` (via `Cart.userId`), `OrderItem` (via `Order.userId`)                                     | schema                                           |
| Per-user "liked" signal for products (no direct product-like exists) | `CreatorLookLike` → join `CreatorLookProduct` (tagged products in looks the viewer liked)                            | schema                                           |
| Optional-auth route pattern (works signed-in or anonymous)           | `optionalAuth` middleware, used by `/products/trending`                                                              | `product.routes.ts`                              |
| Scheduled-job registration                                           | `INTERVAL_JOBS` list                                                                                                 | `apps/api/src/jobs/scheduled-jobs.ts`            |

**No new database tables are needed.** The only new persisted thing is a Redis-cached ranked
candidate list (`cache:product-sale:global`), the same shape as `cache:product-trending:global`.

## 5. Design decisions (please confirm/correct during review)

### 5.1 New module: `sale`, not bolted onto `trending` or `products`

`trending` scores _all_ products by activity signals; `products` owns product CRUD and public
listing. Personalized-sale-ranking is a distinct concern (discount eligibility + a different
scoring formula + per-user affinity), so it gets its own module —
`apps/api/src/modules/sale/` — that _reads from_ `discounts` (money math), `trending` (popularity
score), and the shopping-signal tables, the same way `trending` itself reads from
`creator-looks`-adjacent tables without owning them. `products` gets one new thin orchestration
method (`productService.listSale`) and one new route (`GET /products/sale`), mirroring exactly how
`listTrending` is wired today.

### 5.2 Scoring formula (one job, not two)

Unlike `trending` (which needs hourly bucket aggregation because its 5 signals are raw event
streams), `sale`'s inputs are already low-frequency, already-persisted rows
(`ProductDiscount`, plus `trending`'s own already-computed score) — no aggregation job needed,
just one scoring job:

```
score = (discountPercent / 100) * WEIGHT_DISCOUNT_DEPTH
       + normalizedTrendingScore * WEIGHT_POPULARITY   // 0 if the product isn't in trending's top set
       + discountFreshnessBoost(startsAt)               // small, decaying boost for a recently-started discount
```

Runs every 30 min (`SALE_SCORING_INTERVAL_MS`, matching `trending`'s scoring cadence), over all
products with a currently-active discount, in-stock, approved, brand active. Applies the same
`applyDiversity` (max N per brand) and `applyWeightedRotation` (seeded by the scoring cycle
timestamp) treatment `trending.utils.ts` already has — reused directly, not reimplemented, since
both are pure functions over a generic `{ id, score, brandId }` shape. Writes the top ~50 ranked
candidates to `cache:product-sale:global` (short TTL on an empty result, per the fix in
`fix: stop caching empty trending scores for 40 minutes` — same bug class, same fix, applied here
from day one instead of discovered later).

### 5.3 Personalization: computed per-request, not precomputed per user

For a signed-in viewer, `saleService.getSaleProductIds(viewerId, limit)`:

1. Reads the cached global candidate pool (~50 products, already scored/diversified).
2. Loads the viewer's affinity in a handful of bounded, indexed queries (mirroring
   `buildPersonalizedSnapshot`'s shape): recent `SavedProduct`, `CartItem` (via their `Cart`),
   recent `OrderItem` (via their `Order`s), and `CreatorLookProduct` tags on looks the viewer has
   `CreatorLookLike`d — each capped (`take: N`, most-recent-first), never an unbounded scan.
3. Derives affinity weights per `categoryId` / `productTypeId` / `brandId` from those rows (save
   and cart-add weighted higher than a liked-look tag — explicit intent beats inferred interest),
   the same "weighted signal → boost multiplier" shape `scorePersonalized` already uses for
   follow/hashtag affinity.
4. Re-scores the candidate pool with `score * (1 + affinityBoost)`, capped, then **excludes any
   product the viewer has already purchased** (`OrderItem` for that viewer — a product they own
   doesn't belong in a "you might like this deal" rail regardless of score), and takes the top 5.

This is a live re-rank over an already-small, already-cached pool — cheap, no new cache entry per
user, always reflects the viewer's most recent activity (no staleness from a precomputed
per-user cache).

### 5.4 Anonymous visitors: shared rotation, not per-visitor personalization

The user's ask was "randomize... so it changes for all the user." Two different things could be
meant:

- **(a)** each individual visitor sees a different set, or
- **(b)** the set changes over time so it isn't frozen forever.

Signed-in visitors get **both**, for real, via §5.3. For anonymous visitors, this codebase has no
persistent visitor-id (the closest thing, `trending`'s session-cursor, is a random UUID minted
per-browse-session for _pagination_, not a durable identity cookie usable for
personalization/rotation). Introducing one would be new tracking infrastructure and a real privacy
surface, disproportionate to a homepage rail. So anonymous visitors get **(b) only**: the shared
`applyWeightedRotation`-shuffled pool, reseeded every scoring cycle (~30 min) — the same mechanism
`trending`'s own rail already uses for exactly this reason. **This is the one decision most worth
double-checking with product/design before building** — if true per-anonymous-visitor
randomization is actually required, that's a materially bigger, separate piece of work (a visitor
cookie, its own consent/privacy review) and should be scoped as its own follow-up rather than
folded into this PRD silently.

### 5.5 `PRODUCT_SORT` gets a new value

`PRODUCT_SORT_VALUES` (`packages/utils/src/product-sort/index.ts`) gains `"on-sale"`
(`PRODUCT_SORT.ON_SALE`), alongside `newest` / `trending` / `new-arrivals`. `buildPublicWhere`
gets a branch restricting to products with an active discount when this sort is selected (so a
filtered `/shop?category=x&sort=on-sale` still only shows discounted products, not just
category-then-newest). The unfiltered fast path (`GET /products/sale`, no cursor/category/price)
uses the cached ranked pool exactly like `isUnfilteredTrendingBrowse` does today; a filtered
combination falls back to `listPublic`'s plain query, ordered by discount `startsAt desc` (newest
discount first) — a stated simplification, not a scored fallback, matching how filtered
`sort=trending` already degrades to `reviewedAt desc` today.

## 6. Backend design

### 6.1 New module — `apps/api/src/modules/sale/`

- `sale.constants.ts` — `SALE_SCORING_INTERVAL_MS`, `SALE_RAIL_LIMIT` (`5`, matching
  `TRENDING_LIMIT`'s convention), `SALE_CANDIDATE_POOL_SIZE` (~50), signal weights
  (`WEIGHT_DISCOUNT_DEPTH`, `WEIGHT_POPULARITY`, affinity boost weights per signal type), max-per-brand
  diversity cap.
- `sale.types.ts` — `SaleCandidate`, `ViewerShoppingAffinity`, `SaleScoreBreakdown` (for the
  optional admin debug endpoint, mirroring `TrendDebugSnapshot`).
- `sale.utils.ts` — pure functions: `scoreSaleCandidate`, `deriveAffinityWeights`,
  `scorePersonalizedSale` (mirrors `trending.utils.ts`'s split of pure scoring from I/O — fully
  unit-testable without a DB, same as `trending.utils.test.ts`).
- `sale.repository.ts` — `listActiveDiscountCandidates` (products with an active discount,
  in-stock, approved, brand active — extends `withActiveDiscount()`'s existing shape),
  `listViewerShoppingSignals(viewerId)` (the four bounded queries from §5.3, batched with
  `Promise.all`).
- `sale.service.ts` — `runScoring` (the scheduled job), `getSaleProductIds(viewerId, limit)` (rail,
  cache read + personalization), `listSaleProductIds({ cursor, limit })` (View All fast path,
  mirrors `trendingService.listTrendingProductIds`).
- `sale.README.md` — purpose/structure/funnel/rationale, per CLAUDE.md's module-README rule.
- Admin debug endpoint (`GET /api/admin/sale/products/:productId/debug`) mirroring trending's — a
  cheap add given `sale.types.ts` already needs the breakdown shape for testing; **nice-to-have,
  cut first if the phase plan needs to shrink**, not a hard requirement of this PRD.

### 6.2 Changes to existing modules

- `packages/utils/src/product-sort/index.ts` — add `ON_SALE = "on-sale"`.
- `apps/api/src/modules/products/product.repository.ts` — `buildPublicWhere` branch for
  `sort === PRODUCT_SORT.ON_SALE` (active-discount filter); `listPublic`'s `orderBy` branch for the
  filtered-fallback ordering (§5.5).
- `apps/api/src/modules/products/product.service.ts` — `listSale(viewerId?)` (mirrors
  `listTrending`, calls `saleService.getSaleProductIds`), and an `isUnfilteredSaleBrowse` fast path
  in `listPublic`'s orchestration (mirrors `isUnfilteredTrendingBrowse`).
- `apps/api/src/modules/products/product.controller.ts` / `product.routes.ts` — `GET
/products/sale` (`optionalAuth`, same shape as `/products/trending`).
- `apps/api/src/jobs/scheduled-jobs.ts` — register `sale-scoring` in `INTERVAL_JOBS`.

## 7. Frontend design

- `apps/web/src/features/landing/components/SaleRail/index.tsx` — server component, calls a new
  `getSaleProductsServer()` (mirrors `getTrendingProductsServer` in
  `apps/web/src/features/products/api/getProductsServer.ts`), renders `ProductRail` (reused as-is
  — no new UI component needed, since `ProductCard` already renders the discount badge whenever
  `discountPercent` is present):
  ```
  <ProductRail
    eyebrow="Deals picked for you"        // or a non-personalized eyebrow when there's no viewer signal — TBD copy
    title="On Sale"
    viewAllHref="/shop?sort=on-sale"
    viewAllLabel="See More"
    products={products}
  />
  ```
  Returns `null` (renders nothing) when `products` is empty — see §3's empty-pool rule; this is the
  one place `SaleRail` differs from `TrendingNow`/`NewArrivals`, which always render (with an empty
  message) since they're never expected to be empty.
- New parallel-route slot `apps/web/src/app/(home)/@sale/` (`page.tsx`, `loading.tsx`, `error.tsx`,
  `default.tsx`), following `@trending`'s exact shape; `layout.tsx` gains a `sale: ReactNode` prop
  and renders it in the section order (placement TBD — proposed: right after `@trending`, since
  deal-seeking intent is highest early in the page; open to moving it, e.g. after `@collections`).
- `(home)/README.md` gets a new bullet for `@sale` alongside the other slots, per its existing
  structure.
- `/shop?sort=on-sale` needs no new frontend code — `ShopResults.tsx` already reads `sort` from
  `PRODUCT_SORT_VALUES` generically; it only needs the `product-sort` package's new value.

## 8. Testing plan (per CLAUDE.md — ships with the change, not after)

- **Unit** (`sale.utils.test.ts`, mirrors `trending.utils.test.ts`): `scoreSaleCandidate`'s
  discount-depth/popularity/freshness weighting, `deriveAffinityWeights`'s per-signal-type
  weighting and capping, `scorePersonalizedSale`'s boost-and-cap math, purchased-product exclusion.
- **Integration** (`sale.integration.test.ts`, mirrors `trending.integration.test.ts`): `GET
/products/sale` returns discounted-only/in-stock/approved products; a signed-in viewer with a
  saved product in category X ranks other category-X discounts higher than an anonymous request
  does; a viewer never sees a product they've already purchased; empty-pool returns `[]`; cache
  behaves correctly on cold/warm/expired reads (mirroring the "drops a product once deleted, even
  with a warm cache" pattern already proven for trending).
- **Component** (`SaleRail`, `ProductRail` reuse — likely no new component test needed beyond
  what `ProductRail`/`ProductCard` already cover, since no new UI component is introduced; add one
  only if `SaleRail`'s empty-render branch needs its own coverage).
- Update `coverage.include` in `apps/api/vitest.config.ts` for the new `sale/**` files, per
  CLAUDE.md's coverage-allowlist rule.

## 9. Implementation plan (phased; confirm before starting)

Each phase is a self-contained, reviewable chunk — ship and verify one before starting the next,
per this codebase's established chunked-delivery convention (see `docs/PRD-COMMERCE.md §9` for
what that looked like on a larger feature).

- **C0 — Backend foundation.** New `sale` module (`sale.constants.ts`, `sale.types.ts`,
  `sale.utils.ts` + unit tests). No DB/Redis/routes yet — pure scoring functions only, reviewable
  in isolation.
- **C1 — Candidate pool + scoring job.** `sale.repository.ts`, `sale.service.ts`'s `runScoring`,
  Redis cache wiring, register the job in `scheduled-jobs.ts`. Verify via the admin debug endpoint
  or a direct Redis read that the job produces a sane ranked pool from real discount data.
- **C2 — Public rail endpoint + personalization.** `GET /products/sale`, `getSaleProductIds`
  (cache read + anonymous rotation), then layer in `listViewerShoppingSignals` +
  `scorePersonalizedSale` for signed-in viewers + purchased-product exclusion. Integration tests
  land here.
- **C3 — View All / browse integration.** `PRODUCT_SORT.ON_SALE`, `buildPublicWhere` /
  `listPublic` changes, `isUnfilteredSaleBrowse` fast path, `listSaleProductIds` cursor pagination.
- **C4 — Frontend rail + home page wiring.** `getSaleProductsServer`, `SaleRail`, `@sale` parallel
  route slot, `layout.tsx`/`README.md` updates. Manually verify signed-in vs. anonymous vs.
  empty-pool rendering in the browser.
- **C5 — Polish.** Empty/loading/error states double-checked against `HomeSectionError`
  conventions, copy for the rail eyebrow/title (personalized vs. generic), full `pnpm test`,
  `sale/README.md` written, `graphify update`.

Optional, can be dropped without affecting the above: the admin debug endpoint (§6.1's last
bullet) — useful for verifying scores in C1/C2 but not required for the feature to ship.

## 10. Open questions for you to confirm

1. **§5.4** — is shared time-based rotation an acceptable answer for anonymous visitors, or is
   true per-visitor randomization a hard requirement (which would need a new visitor-identity
   mechanism, out of this PRD's scope as written)?
2. **Placement** — where should `@sale` sit in the section order? Proposed: right after
   `@trending`.
3. **Rail copy** — "On Sale" / "Deals picked for you" as working titles; any brand voice
   preference?
4. Any minimum discount % to qualify, or is "any active discount" correct for v1 (§2.2)?
