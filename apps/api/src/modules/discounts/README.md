# Discounts

## Purpose

The pricing kernel for two distinct discount models: a brand-funded sale price on a product, and a
platform-funded coupon applied at checkout. Owns the pure money math `products`, `cart` and
`orders` depend on — resolving a product's brand-funded effective price, checking a brand discount
against its ceiling, valuing a coupon against a cap, splitting a cart-level coupon across the
order's line items without losing or inventing a rupee, and asserting that an order's totals stay
internally consistent. No I/O, no schema, no Prisma types — every export is a pure function over
plain numbers, mirroring how `brand-payouts` isolates its fee math (`computeTieredPlatformFee`,
`computeGatewayFee`) in `*.utils.ts` ahead of anything that calls it.

## Structure

- `discount.utils.ts` — `toActiveBrandDiscount` (narrows any discount-shaped record — a Prisma
  `ProductDiscount` row, a batched-lookup Map value, `null`/`undefined` — down to exactly the three
  fields the functions below need, so `products`, `cart` and `orders` all feed this kernel the same
  shape without duplicating the pick), `resolveBrandFundedUnitPrice` (list price minus an active
  brand discount, floored at the minimum effective price), `isBrandDiscountWithinCeiling` (rejects a
  brand discount worth more than `MAX_BRAND_DISCOUNT_BASIS_POINTS` of the list price, for either
  discount type — used by `products`' create/update-discount validation), `computeDiscountPercent`
  (the whole-number percent-off badge shown next to a struck-through price — used by both `products`
  and `cart`, which is why it lives here rather than in either module's own `*.utils.ts`),
  `computeCouponValue` (percent/fixed valuation with cap and eligible-subtotal ceiling applied),
  `allocatePlatformDiscountToLines` (largest-remainder split of a cart-level discount across order
  lines, deterministically tie-broken), and `assertOrderMoneyInvariant` (throws if an order's
  `total` doesn't reconcile against its subtotal, discount and fees, or if per-line discount
  allocations don't sum to the order-level total). `resolveBrandFundedUnitPrice` and
  `isBrandDiscountWithinCeiling` both derive from the same private `computeBrandDiscountAmount` so
  the ceiling check and the price actually charged can never disagree about what a given discount is
  worth.
- `discount.constants.ts` — `MAX_BRAND_DISCOUNT_BASIS_POINTS` (the ceiling `products`' discount
  write path validates against), `MIN_EFFECTIVE_PRICE` (mirrors `products`' own `PRICE_MIN`).
- `discount.types.ts` — the plain-object shapes these functions take and return
  (`DiscountableLine`, `AllocatedDiscount`, `ActiveBrandDiscount`, `CouponValueRule`,
  `OrderMoneyInvariantInput`). Deliberately not Prisma-generated types — `ActiveBrandDiscount`'s
  three fields are exactly what `resolveBrandFundedUnitPrice`/`isBrandDiscountWithinCeiling` need,
  so `products` maps its `ProductDiscount` row down to this shape at the call site rather than this
  module importing a Prisma type.

Basis-point-to-rupee conversion reuses `BASIS_POINTS_PER_PERCENT` from
`#constants/money.constants.js`, shared with `brand-payouts`.

## Funnel

**Wired in, for brand-funded discounts:**

- `products` calls `resolveBrandFundedUnitPrice` from `product.utils.ts`'s
  `toPublicProduct`/`toBrandSummary` mappers (every public listing, the product detail page, and a
  brand's own product list all show the effective price), and `isBrandDiscountWithinCeiling` from
  `product.service.ts`'s discount create/update methods. See `../products/README.md` for the
  `ProductDiscount` schema and the create/update/remove flow.
- `cart` calls the same `resolveBrandFundedUnitPrice`/`computeDiscountPercent` pair from
  `cart.service.ts`'s `buildCartView`, so a shopper sees the discounted price before checkout, not
  just at the order confirmation.
- `orders` calls it a third time, independently, inside `checkoutOnce` — the cart's price is never
  trusted, checkout always re-resolves from the product row at the moment of purchase. See
  `../orders/README.md`.

**Wired in, for platform-funded coupons:** `../coupons/coupon.utils.ts`'s `valuateCoupon` calls
`computeCouponValue` and `allocatePlatformDiscountToLines` together — the coupon's rupee value and
its per-line split are computed in one pass. `orders`' `checkoutOnce` calls
`assertOrderMoneyInvariant` right before writing the order, checking both that `total` reconciles
and that the per-line `platformDiscountAmount`s it's about to write sum to `platformDiscountTotal`.
See `../coupons/README.md` for the full redemption flow.

## Non-obvious rationale

- **`allocatePlatformDiscountToLines` weights each line's share by its own `eligibleAmount`, not by
  a separately-tracked cap.** Because the function first caps the total discount at the sum of
  `eligibleAmount` across all lines, every line's proportional share is mathematically guaranteed to
  never exceed that same line's `eligibleAmount` — there is no floor-then-redistribute pass because
  there is nothing left to redistribute. This is verified, not assumed: the unit tests include a
  200-trial randomised property check asserting the sum always matches exactly and no line is ever
  over- or under-shot.
- **The leftover-rupee tie-break order is `remainder` desc, then `eligibleAmount` desc, then
  `orderItemId` ascending.** The first two match the written business rule; the id ordering exists
  purely to make the result byte-for-byte reproducible in tests and in production — two lines with
  identical value must not have their extra rupee decided by object insertion order or `Map`
  iteration order.
- **`assertOrderMoneyInvariant` checks two things, not three.** The spec's third invariant —
  `Σ BrandPayout.grossAmount == Order.subtotal` — can't be checked here because `grossAmount` isn't
  a plain number this module ever sees; it holds by construction as long as no code path ever
  computes a payout's `grossAmount` from a coupon-adjusted price instead of
  `resolveBrandFundedUnitPrice`'s output. That discipline is enforced by the type boundary between
  this module and `orders`/`brand-payouts`, not by a runtime check.
- **`computeCouponValue` and `resolveBrandFundedUnitPrice` don't validate their own inputs (e.g. a
  negative `fixedAmount`, an out-of-range `percentBasisPoints`).** Validation belongs at the write
  boundary — a coupon's or a product discount's create/update schema — not re-checked on every
  read. The functions do still floor their own _output_ at zero (coupon value) or the price floor
  (effective price) because that's an output guarantee this module makes regardless of how a bad
  input got past validation, not input validation itself.
