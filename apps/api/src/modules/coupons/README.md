# Coupons

## Purpose

Platform-funded discounts — a code a customer applies at checkout that lowers what they pay while
the brand is paid in full, exactly as though the order were placed at full price. This is Phase 3
of the discount-architecture spec: the coupon entity, its eligibility rules, the redemption ledger
with atomic budget/one-per-user claims, and the cart apply/remove + checkout integration. See
`../discounts/README.md` for the pure pricing-kernel functions this module calls
(`computeCouponValue`, `allocatePlatformDiscountToLines`) and `../products/README.md` for the
brand-funded counterpart (Phase 1) this module deliberately never touches.

## Structure

- `coupon.types.ts` — `CouponRecord`/`CouponWithEligibility`/`CouponView` (DB, DB+relations, and
  API-response shapes), `CouponLine` (the plain-object shape `coupon.utils.ts`'s pure functions take
  — `products`/`cart`/`orders` each map their own line representation down to this), `CouponValuation`.
- `coupon.constants.ts` — code length bounds, pagination defaults.
- `coupon.schemas.ts` — Zod validation, including the same "exactly one amount field for this type"
  refinement `products`' discount schemas use, and codes normalized to uppercase at the schema layer
  so `WELCOME300`/`welcome300` are the same coupon everywhere.
- `coupon.utils.ts` — pure functions: `isCouponWithinWindow`, `lineMatchesEligibility`/
  `resolveEligibleLines` (empty eligibility = whole catalogue; a per-coupon
  `stacksWithBrandDiscount` flag excludes already-discounted lines), `valuateCoupon` (wraps
  `computeCouponValue` + `allocatePlatformDiscountToLines` from `../discounts`), `toCouponView`.
- `coupon.repository.ts` — CRUD, `findActiveRedemptionForUser` (the read-side check), `claimBudget`
  (the atomic conditional `UPDATE`, raw SQL because the `WHERE` clause compares two columns of the
  same row — Prisma's filter API can't express that), `createRedemption`/`releaseBudget`/
  `markRedemptionReleased` for the cancel-time release path.
- `coupon.service.ts` — `resolveForContext` is the one function that decides whether a code is
  usable right now for a given set of lines: not-found → window → prepaid-only → first-order-only →
  already-redeemed → minimum subtotal → eligibility → valuation, in that order, each with its own
  `AppError` code. Called identically from `cart`'s apply endpoint (preview, nothing committed) and
  from `orders`' checkout (the real, race-safe attempt) — see Funnel.
- `coupon.controller.ts`/`coupon.routes.ts` — admin-only CRUD (`create`, `list`, `getById`,
  `updateStatus`), mounted at `/api/admin/coupons`.

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

**Cancelling an order releases its coupon.** `orderService.cancel`'s existing transaction now also
looks up the order's `CouponRedemption` (if any) and, if not already released, marks it `RELEASED`
and decrements the coupon's `spentAmount`/`redemptionCount` — freeing the budget unit and the
per-user slot for a future order.

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
- **A cancelled order always releases its coupon**, regardless of who or what caused the
  cancellation — the spec's own recommendation is narrower (release only for a platform-caused
  cancellation like an out-of-stock item; consume it on a customer-initiated cancellation, to block
  the buy-refund-rebuy farming loop). This module takes the simpler, more customer-friendly default
  because `orderService.cancel` doesn't currently distinguish _why_ an order is being cancelled at
  the call site in a way this module can key off of — building that distinction is Phase 5 hardening
  work, tracked there, not silently skipped. The tradeoff is explicit: this configuration is more
  farmable (order, cancel, reorder) than the spec's recommendation until that follow-up lands.
- **No `FREE_DELIVERY` coupon type** — the spec itself scopes this out of v1 ("delivery and COD fees
  are not discountable in v1; a dedicated `FREE_DELIVERY` coupon type covers that case explicitly
  and prices it separately"), so only `PERCENT`/`FIXED` exist here.
- **No Buy Now support** — `checkoutOnce` only resolves a coupon for the cart-based path
  (`appliedCouponCode` lives on `Cart`, which Buy Now bypasses entirely). The spec lists this
  explicitly as a Phase 5 edge case ("Buy Now path — bypasses the cart entirely and needs its own
  coupon handling"), not something this phase silently drops.
- **No second-admin approval, budget alerts, live redemption feed, or velocity/fraud detection** —
  all explicitly Phase 4/5 scope in the spec (the operational/reporting layer once coupons already
  work correctly). `POST /api/admin/coupons` is single-admin CRUD, sufficient to create and manage a
  real coupon end to end; the two-admin sign-off pattern `withdraw` already implements is the
  natural place to wire in later without changing this module's redemption path at all.
- **Order/order-summary views surface `platformDiscountTotal`/`brandDiscountTotal` and each item's
  `platformDiscountAmount`/`brandDiscountAmount`/`listUnitPrice` (`order.types.ts`/`order.utils.ts`),
  but not yet the coupon's code as a labelled line** (`"WELCOME300 · −Rs 300"` from the spec's web
  section) — that needs joining `CouponRedemption`→`Coupon` across every order read path
  (`findByIdForUser`, `listForUser`, admin equivalents), deferred as a display-only follow-up since
  the money itself is already correctly stored and shown as a number.
