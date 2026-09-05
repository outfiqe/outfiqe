# Discounts

## Purpose

The pricing kernel for two distinct discount models: a brand-funded sale price on a product, and a
platform-funded coupon applied at checkout. Owns the pure money math both `cart` and `orders` will
depend on — resolving a product's brand-funded effective price, valuing a coupon against a cap,
splitting a cart-level coupon across the order's line items without losing or inventing a rupee,
and asserting that an order's totals stay internally consistent. No I/O, no schema, no Prisma
types — every export is a pure function over plain numbers, mirroring how `brand-payouts` isolates
its fee math (`computeTieredPlatformFee`, `computeGatewayFee`) in `*.utils.ts` ahead of anything
that calls it.

## Structure

- `discount.utils.ts` — `resolveBrandFundedUnitPrice` (list price minus an active brand discount,
  floored at the minimum effective price), `computeCouponValue` (percent/fixed valuation with cap
  and eligible-subtotal ceiling applied), `allocatePlatformDiscountToLines` (largest-remainder
  split of a cart-level discount across order lines, deterministically tie-broken), and
  `assertOrderMoneyInvariant` (throws if an order's `total` doesn't reconcile against its subtotal,
  discount and fees, or if per-line discount allocations don't sum to the order-level total).
- `discount.constants.ts` — `MAX_BRAND_DISCOUNT_BASIS_POINTS` (the ceiling a future brand-discount
  write path validates against), `MIN_EFFECTIVE_PRICE` (mirrors `products`' own `PRICE_MIN`).
- `discount.types.ts` — the plain-object shapes these functions take and return
  (`DiscountableLine`, `AllocatedDiscount`, `ActiveBrandDiscount`, `CouponValueRule`,
  `OrderMoneyInvariantInput`). Deliberately not Prisma-generated types — this module has no schema
  yet, and these shapes exist independently of how a future schema names its columns.

Basis-point-to-rupee conversion reuses `BASIS_POINTS_PER_PERCENT` from
`#constants/money.constants.js`, shared with `brand-payouts`.

## Funnel

This module is not yet wired into any request path. It ships dormant: no route, controller,
service or repository calls it. `cart` and `orders` will import `discount.utils.ts` directly, the
same way `orders` already imports `deliveryZoneService` across module boundaries, once the
brand-funded discount schema (product sale prices) and the coupon/redemption schema exist.

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
