# Coupons

## Purpose

Platform-funded discounts — a code a customer applies at checkout that lowers what they pay while
the brand is paid in full, exactly as though the order were placed at full price. This module now
spans Phases 3–5 of the discount-architecture spec: the coupon entity, its eligibility rules, the
redemption ledger with atomic budget/one-per-user claims, the cart apply/remove + checkout
integration (Phase 3), the admin approval/budget-alert control surface and reporting (Phase 4;
`apps/admin/src/features/coupons`), and the cancellation policy, rate limiting, and velocity-fraud
flagging that harden it (Phase 5). See `../discounts/README.md` for the pure pricing-kernel functions
this module calls (`computeCouponValue`, `allocatePlatformDiscountToLines`) and `../products/README.md`
for the brand-funded counterpart (Phase 1) this module deliberately never touches.

## Structure

- `coupon.types.ts` — `CouponRecord`/`CouponWithEligibility`/`CouponView` (DB, DB+relations, and
  API-response shapes), `CouponLine` (the plain-object shape `coupon.utils.ts`'s pure functions take
  — `products`/`cart`/`orders` each map their own line representation down to this), `CouponValuation`,
  `CouponPerformanceView`/`CouponRedemptionSearchFilters`/`CouponRedemptionSearchRow` (Phase 4
  reporting/support shapes).
- `coupon.constants.ts` — code length bounds, pagination defaults, `COUPON_APPROVAL_BUDGET_THRESHOLD`
  (Rs 50,000, per the spec's Operating Model table), `COUPON_BUDGET_ALERT_THRESHOLDS_PERCENT`
  (`[50, 80, 95, 100]`), `VELOCITY_WINDOW_HOURS`/`VELOCITY_REDEMPTION_THRESHOLD` (24h / 3 — see
  Funnel).
- `coupon.schemas.ts` — Zod validation, including the same "exactly one amount field for this type"
  refinement `products`' discount schemas use, and codes normalized to uppercase at the schema layer
  so `WELCOME300`/`welcome300` are the same coupon everywhere.
- `coupon.utils.ts` — pure functions: `isCouponWithinWindow`, `lineMatchesEligibility`/
  `resolveEligibleLines` (empty eligibility = whole catalogue; a per-coupon
  `stacksWithBrandDiscount` flag excludes already-discounted lines), `valuateCoupon` (wraps
  `computeCouponValue` + `allocatePlatformDiscountToLines` from `../discounts`), `toCouponView`,
  `resolveCouponCreationState`/`computeBudgetUtilizationPercent`/`resolveCrossedBudgetThreshold`
  (Phase 4 approval-gate and budget-alert logic — see Funnel).
- `coupon.repository.ts` — CRUD, `findActiveRedemptionForUser` (the read-side check), `claimBudget`
  (the atomic conditional `UPDATE`, raw SQL because the `WHERE` clause compares two columns of the
  same row — Prisma's filter API can't express that), `createRedemption`/`releaseBudget`/
  `markRedemptionReleased` for the cancel-time release path, `approve`/`claimBudgetAlertThreshold`/
  `autoPause` (each its own atomic conditional `UPDATE`, same pattern as `claimBudget`),
  `getPerformanceMetrics` (one raw-SQL query joining redemptions → orders → order items →
  brand payouts for GMV/spend/commission/new-vs-returning/repeat-purchase aggregates),
  `searchRedemptions` (support lookup by code/user/order), `countRecentRedemptionsForContact`/
  `flagRedemptionForReview` (the velocity-fraud signal — see Funnel).
- `coupon.service.ts` — `resolveForContext` is the one function that decides whether a code is
  usable right now for a given set of lines: not-found → window → prepaid-only → first-order-only →
  already-redeemed → minimum subtotal → eligibility → valuation, in that order, each with its own
  `AppError` code. Called identically from `cart`'s apply endpoint (preview, nothing committed) and
  from `orders`' checkout (the real, race-safe attempt) — see Funnel. `approve`/`updateBudget` own the
  second-admin approval workflow; `afterRedemptionCommitted` (called by `orders` after its checkout
  transaction commits) owns budget-alert firing and 100%-budget auto-pause.
- `coupon.controller.ts`/`coupon.routes.ts` — admin-only CRUD (`create`, `list` — filterable by
  `status`, `getById`, `updateStatus`, `approve`, `updateBudget`, `getPerformance`,
  `searchRedemptions`), mounted at `/api/admin/coupons`, gated by both `requirePlatformAccess` and
  `requirePlatformNavItem("coupons")` (so an admin whose nav access has been narrowed loses API access
  too, not just the sidebar link — same pattern `withdraw`/`financial-rollup` already use).

## Funnel

**Admin creates a coupon** — `POST /api/admin/coupons` (platform staff only, via
`requirePlatformAccess`), a code, PERCENT or FIXED value, optional cap/budget/eligibility rows, and
an active/paused status. Pausing is instant: `updateStatus` just flips the `status` column, and
`isCouponWithinWindow` reads it fresh on every request — no cache, no TTL, matching the "kill switch
takes effect immediately" requirement.

**Customer applies a code in their cart** — `POST /api/cart/coupon` builds one `CouponLine` per
non-sold-out cart item (brand/category/product-type attributes batched via
`productRepository.findEligibilityAttributesByIds`, same batching shape `orders`' checkout already
uses for brand discounts), calls `couponService.resolveForContext`, and — only if it doesn't throw —
stores the normalized code on `Cart.appliedCouponCode`. `GET /api/cart` (and every other cart
mutation) re-runs the same validation on every read to compute the preview
(`cart.service.ts`'s `previewCoupon`), swallowing a now-invalid coupon into "not applied" for
display rather than erroring — a coupon that expired or got exhausted since it was applied just
quietly stops showing a discount; the stored code isn't deleted, so a fresh apply attempt still
gets a clear error explaining why.

**Checkout is the only place a coupon is ever actually spent.** `checkoutOnce` reads
`cart.appliedCouponCode` itself — the client never sends a coupon code to checkout — and, for a
non-buy-now checkout, calls `couponService.resolveForContext` again, completely independently, using
the same freshly-resolved brand-discounted prices as the eligibility input. This is deliberate
double validation: cart-apply is a convenience preview, checkout is the only validation that can
ever move money. If the coupon has become invalid between apply and checkout, checkout throws and
the order is never created — no silent full-price charge, no silent free discount.

**The atomic claim happens inside the same transaction as everything else.** After the order (with
each `OrderItem.platformDiscountAmount` already computed from `valuateCoupon`'s allocation) is
inserted, `couponRepository.claimBudget` runs its conditional `UPDATE` and `createRedemption` inserts
the ledger row — both inside `checkoutOnce`'s existing `prisma.$transaction`, alongside the stock
decrement and `BrandPayout` inserts. A zero-row claim (budget or redemption-count exhausted since
the pre-check) or a unique-constraint violation on the redemption insert (another concurrent
checkout for the same user won the race) both throw, rolling back the entire order — a failed
coupon claim never leaves a half-created order or a silently-lost budget unit. Verified directly
against the database: a budget sized for `N−1` redemptions with `N` concurrent checkouts produces
exactly `N−1` successes, and two concurrent first-time checkouts by the same user produce exactly
one (`coupon.integration.test.ts`).

**Cancelling an order releases its coupon only when the platform caused the cancellation.**
`orderService.cancel`'s existing transaction looks up the order's `CouponRedemption` (if any); when
`CancelOrderActor.type === "ADMIN"` (out of stock, our error, an admin-initiated cancellation) it
marks the redemption `RELEASED` and decrements the coupon's `spentAmount`/`redemptionCount`, freeing
the budget unit and the per-user slot. When the actor is `"BUYER"` (the customer cancelling their own
order), the redemption stays `CONSUMED` — the coupon shot is spent either way, which is exactly what
closes the buy-refund-rebuy farming loop per decision 3.

**A large budget needs a second admin's sign-off before it can spend a single rupee.**
`couponService.create` (and `updateBudget`, on any raise) runs `resolveCouponCreationState`: a
`totalBudgetAmount` over `COUPON_APPROVAL_BUDGET_THRESHOLD` (Rs 50,000) forces the coupon to start
`PAUSED` with `requiresApproval: true` regardless of what status was requested — `isCouponWithinWindow`
already refuses a non-`ACTIVE` coupon, so this alone is enough to keep it unusable at checkout with no
extra guard needed. `PATCH /:id/approve` requires a different admin than `createdById` (mirroring
`withdraw`'s same-admin-rejection pattern, but as a single sign-off rather than withdraw's two-step
first/second approval, since the spec calls for one different approver, not two), and
`PATCH /:id/status` itself refuses to activate a still-unapproved coupon
(`COUPON_APPROVAL_REQUIRED`). Raising an already-approved coupon's budget past the threshold again
resets `requiresApproval`/`approvedById`/`approvedAt` and re-pauses it — approval doesn't carry over
to a materially bigger commitment.

**Budget alerts fire once per threshold, race-safely, without a scheduled job.**
`afterRedemptionCommitted` runs after every coupon checkout commits (same post-commit slot as the
`PRODUCT_PURCHASED`/`SALE_GENERATED` events), computes the coupon's current spend percentage, and
claims the highest newly-crossed threshold (50/80/95/100) via `claimBudgetAlertThreshold` — an atomic
conditional `UPDATE` identical in shape to `claimBudget`, so two concurrent redemptions crossing the
same threshold can never double-fire the alert. A successful claim publishes
`DomainEvents.COUPON_BUDGET_ALERT` (consumed by `notifications` to page every admin); reaching 100%
also atomically flips the coupon to `PAUSED` via `autoPause` — the same instant, no-cache kill-switch
mechanism `updateStatus` already uses, just triggered by budget instead of an admin click.

**A redemption flagged for review never blocks the order.** The same `afterRedemptionCommitted`
post-commit slot runs `checkRedemptionVelocity`, which counts other non-`RELEASED` redemptions
(any coupon, not just this one) sharing the just-placed order's delivery phone or address within the
last `VELOCITY_WINDOW_HOURS` (24h). At `VELOCITY_REDEMPTION_THRESHOLD` (3) or more, it stamps
`flaggedForReview`/`flagReason` on the redemption and publishes `DomainEvents.COUPON_REDEMPTION_FLAGGED`
so every admin gets paged — matching the spec's "flag for review rather than auto-block" call, since a
false positive on a small user base costs more than the fraud it would have caught. The flag is
visible in the admin redemption lookup (`apps/admin/src/features/coupons`) alongside the existing
release reason.

**`POST /api/cart/coupon` is rate-limited per user** (`cartCouponApplyRateLimit`, `cart.routes.ts`) —
the same `rateLimit` middleware and shape as `orders`' checkout/cancel limiters, closing the
code-guessing-oracle gap the spec calls out explicitly under "Enforced in policy."

## Non-obvious rationale

- **The invariant this whole module exists to protect: a coupon never touches `unitPrice`,
  `grossAmount`, or anything `BrandPayout` reads.** `platformDiscountAmount` is a parallel column on
  `OrderItem`, and `Order.platformDiscountTotal` is subtracted only when computing `total` —
  `subtotal` (and therefore every brand payout) is computed exactly as if the coupon didn't exist.
  This is the single fact the "defining test" in `coupon.integration.test.ts` checks directly: a
  coupon order's `BrandPayout.grossAmount`/`platformFee`/`netAmount` are identical to what a
  full-price sale at the same price would produce.
- **`platformDiscountAmount` is a line _total_, not a per-unit amount** — unlike `brandDiscountAmount`
  (per unit, since a brand discount is a price property). A coupon's value is allocated to a line as
  a lump sum by `allocatePlatformDiscountToLines`, which has no clean per-unit meaning when a line's
  `qty` isn't evenly divisible into the allocated rupees. This matches the spec's own stated
  invariant literally: `Σ OrderItem.platformDiscountAmount = Order.platformDiscountTotal`, with no
  `× qty` in that sum.
- **`CouponStatus` is deliberately smaller than the spec's sketch** — `ACTIVE`/`PAUSED`/`ARCHIVED`
  only, not `DRAFT`/`SCHEDULED`/`EXHAUSTED`/`EXPIRED` as separate stored states. Whether a coupon is
  actually usable right now is a derived read-time check (`isCouponWithinWindow` plus the atomic
  budget/redemption-count claim), not a state a background sweep needs to transition into. This
  keeps every correctness guarantee (budget, one-per-user, window) enforced by the same
  read-time-check-plus-atomic-claim mechanism already proven for stock decrements, with no new
  scheduled job — a deliberate scope cut for this phase, not an oversight; a future admin-reporting
  pass (Phase 4) can still compute "effectively expired" or "effectively exhausted" as a view over
  the existing columns without a schema change.
- **`CouponRedemptionStatus` only has `CONSUMED`/`RELEASED`**, not the spec's separate `RESERVED`
  state — a redemption is written already-consumed inside the same transaction as the order, so
  there's no window where a redemption exists but the order doesn't (unlike a multi-step reservation
  flow that would need a distinct in-flight state).
- **No `FREE_DELIVERY` coupon type** — the spec itself scopes this out of v1 ("delivery and COD fees
  are not discountable in v1; a dedicated `FREE_DELIVERY` coupon type covers that case explicitly
  and prices it separately"), so only `PERCENT`/`FIXED` exist here.
- **No Buy Now coupon support, by design, not by gap** — `checkoutOnce` only resolves a coupon for the
  cart-based path (`appliedCouponCode` lives on `Cart`, which Buy Now bypasses entirely); a coupon
  applied to the cart is silently ignored on a Buy Now checkout rather than erroring, and no budget or
  redemption is consumed (`coupon.integration.test.ts` — "ignores an applied cart coupon on the Buy
  Now path"). The spec lists Buy Now as a Phase 5 edge needing "its own coupon handling"; building
  that (letting a code apply to a single Buy Now line) is still deferred — what Phase 5 closed is the
  silent-failure risk, not the feature gap.
- **Velocity detection flags by delivery phone/address, not device or IP** — the spec's recommended
  signals are "device, IP or delivery address," but this codebase doesn't capture a device fingerprint
  or client IP anywhere in the order path today, and adding that is request-level plumbing well beyond
  this module's scope. Phone and address are already collected on every `Order`, so
  `countRecentRedemptionsForContact` reuses them for a real, if narrower, fraud signal; device/IP
  fingerprinting remains open follow-up work if phone/address prove insufficient in practice.
- **No verified-phone requirement, no prepaid-above-a-value-threshold enforcement, no code-entropy
  generator** — the spec recommends all three, but each needs infrastructure this codebase doesn't
  have yet (phone OTP verification), or would silently override an admin's own explicit configuration
  (a hard COD-value cutover was tried and reverted here — it broke `prepaidOnly: false` coupons an
  admin had deliberately allowed on COD; the create-coupon admin UI now shows the Rs 200 recommendation
  as a note next to the prepaid-only checkbox instead of enforcing it), or is already covered by
  letting an admin type any code including a long random one (entropy is an admin-authoring choice,
  not something this module can force). Each remains a real, named gap, not a silent one.
- **A crossed-threshold jump reports only the highest threshold, not every one it passed** — a single
  redemption large enough to jump straight from 0% to 100% of a small budget fires one alert at 100%,
  not four separate alerts at 50/80/95/100. `resolveCrossedBudgetThreshold` returns the max of the
  newly-crossed thresholds; the alert's payload still carries the exact `spentAmount`/
  `totalBudgetAmount`, so nothing about the actual spend is lost, only the intermediate labels.
- **`getPerformanceMetrics`'s new-vs-returning and repeat-purchase figures are computed live from
  `orders`, not stored on the redemption** — "new" means no other order by that user exists with an
  earlier `createdAt` than the coupon order; "repeat within 30/90d" means at least one other order by
  that user exists after it within that window. Both are correct as of query time but will shift as
  more orders come in after the fact (a redemption that looked "no repeat yet" can become a repeat
  once 40 days have passed) — this is expected for a rolling report, not a bug.
- **The coupon code as a labelled line on brand payouts is now surfaced as a boolean, not the code
  itself** — `BrandPayoutView.platformFundedDiscountApplied` (`../brand-payouts/README.md`) tells a
  brand "this payout's order used a platform coupon, your payout was unaffected" without joining
  `CouponRedemption` from the payout list at all, since the trust signal only needs a yes/no, not
  which code. The order-level "`WELCOME300` · −Rs 300" labelled line from the spec's web section is
  still the deferred follow-up noted below.
- **Order/order-summary views surface `platformDiscountTotal`/`brandDiscountTotal` and each item's
  `platformDiscountAmount`/`brandDiscountAmount`/`listUnitPrice` (`order.types.ts`/`order.utils.ts`),
  but not yet the coupon's code as a labelled line** (`"WELCOME300 · −Rs 300"` from the spec's web
  section) — that needs joining `CouponRedemption`→`Coupon` across every order read path
  (`findByIdForUser`, `listForUser`, admin equivalents), deferred as a display-only follow-up since
  the money itself is already correctly stored and shown as a number.
